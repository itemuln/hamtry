import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, extname, resolve, sep } from 'node:path'
import { themeRoute } from './theme-store.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist')
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}
createServer(async (req, res) => {
  if (await themeRoute(req, res)) return
  if (req.method !== 'GET') {
    res.writeHead(405).end()
    return
  }
  try {
    const path = decodeURIComponent(
      new URL(req.url!, 'http://localhost').pathname,
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
}).listen(
  Number(process.env.PORT || 4173),
  process.env.HOST || '127.0.0.1',
  () => {
    console.log(
      'Hamtry authoring server ready. Shared theme is saved in theme/hamtry-theme.json.',
    )
  },
)
