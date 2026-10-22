import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const client = fileURLToPath(new URL('..', import.meta.url))
const backend = resolve(client, '../../Back-End/liveness')
const python = resolve(backend, '.venv/bin/python')
const port = process.env.LIVENESS_PORT || '8001'
const children = []
let stopping = false

function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) child.kill('SIGTERM')
}
function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' })
  children.push(child)
  child.on('error', error => { console.error(error.message); stop(1) })
  child.on('exit', code => { if (!stopping) stop(code ?? 1) })
  return child
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

async function backendReady() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/liveness/health`, { signal: AbortSignal.timeout(1000) })
    return response.ok && (await response.json()).status === 'ready'
  } catch { return false }
}

let ready = await backendReady()
if (!ready && !existsSync(python)) {
  console.error('Python environment missing. See README.md: Selfie backend setup.')
  process.exitCode = 1
} else {
  if (ready) console.log(`Using running selfie backend on port ${port}.`)
  else {
    start(python, ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', port], backend)
    console.log('Loading selfie models…')
  }
  const deadline = Date.now() + 120000
  while (!stopping && !ready && Date.now() < deadline) {
    ready = await backendReady()
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (!stopping && ready) start(process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], client)
  else if (!stopping) { console.error('Selfie backend did not start within 120 seconds.'); stop(1) }
}
