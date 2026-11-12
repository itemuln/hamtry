import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, extname, resolve, sep } from 'node:path'
import { livenessRoute } from './liveness-proxy.js'
import { themeRoute } from './theme-store.js'
import { pdfRoute } from './document-pdf.js'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const serverDirectory = dirname(fileURLToPath(import.meta.url))
const localPython = resolve(serverDirectory, '../../../Back-End/liveness/.venv/bin/python')
const livenessPort = process.env.LIVENESS_PORT || '8001'
let liveness
const livenessReady = async () => {
  try {
    const response = await fetch(`http://127.0.0.1:${livenessPort}/api/liveness/health`, { signal: AbortSignal.timeout(1000) })
    return response.ok && (await response.json()).status === 'ready'
  } catch { return false }
}
if (!(await livenessReady())) {
  liveness = spawn(process.env.HAMTRY_PYTHON || (existsSync(localPython) ? localPython : 'python3'), ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', livenessPort], {
    cwd: resolve(serverDirectory, '../liveness'), stdio: 'inherit',
    env: { ...process.env, DEEPFACE_HOME: process.env.DEEPFACE_HOME || resolve(serverDirectory, '../.models') },
  })
  liveness.on('error', error => { console.error('Could not start selfie backend:', error.message); process.exit(1) })
  liveness.on('exit', code => { if (code !== null) process.exit(code || 1) })
  console.log('Loading selfie models…')
  const deadline = Date.now() + 600000
  while (Date.now() < deadline && !(await livenessReady())) await new Promise(resolve => setTimeout(resolve, 1000))
  if (!(await livenessReady())) { liveness.kill('SIGTERM'); throw new Error('Selfie backend did not become ready within 10 minutes.') }
}
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
}
const server = createServer(async (req, res) => {
  if (livenessRoute(req, res)) return
  if (pdfRoute(req, res)) return
  if (await themeRoute(req, res, true)) return
  if (req.method !== 'GET') {
    res.writeHead(405).end()
    return
  }
  try {
    const path = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    )
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end()
      return
    }
    const data = await readFile(file)
    res.setHeader(
      'Content-Type',
      types[extname(file)] || 'application/octet-stream',
    )
    res.end(data)
  } catch {
    res.writeHead(404).end('Not found.')
  }
})
server.listen(
  Number(process.env.PORT || 4173),
  process.env.HOST || '127.0.0.1',
  () => {
    console.log(
      'Hamtry server ready. Theme is read-only; edit locally and deploy through Git.',
    )
  },
)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  liveness?.kill(signal)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
})
