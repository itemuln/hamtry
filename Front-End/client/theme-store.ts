import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  emptyOverrides,
  exportTheme,
  parseOverrides,
  themeCss,
} from './src/design-system/theme.ts'

const root = dirname(fileURLToPath(import.meta.url))
export const themeFile =
  process.env.HAMTRY_THEME_FILE || join(root, 'theme/hamtry-theme.json')
let queue = Promise.resolve()

export async function readTheme() {
  try {
    return parseOverrides(JSON.parse(await readFile(themeFile, 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return emptyOverrides()
    throw error
  }
}

export async function themeRoute(req: IncomingMessage, res: ServerResponse) {
  const path = req.url?.split('?')[0]
  if (path !== '/api/theme' && path !== '/hamtry-theme.css') return false
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'GET') {
      const theme = await readTheme()
      res.setHeader(
        'Content-Type',
        path === '/api/theme' ? 'application/json' : 'text/css',
      )
      res.end(
        path === '/api/theme'
          ? JSON.stringify(exportTheme(theme))
          : themeCss(theme),
      )
    } else if (req.method === 'PUT' && path === '/api/theme') {
      // This is the local authoring server; cross-origin pages cannot write to it.
      const origin = req.headers.origin
      if (origin && new URL(origin).host !== req.headers.host) {
        res.writeHead(403).end('Cross-origin theme edits are not allowed.')
        return true
      }
      let body = ''
      for await (const chunk of req) {
        body += chunk.toString()
        if (Buffer.byteLength(body) > 65536) {
          res.writeHead(413).end('Theme is too large.')
          return true
        }
      }
      let theme
      try {
        theme = parseOverrides(JSON.parse(body))
      } catch (error) {
        res
          .writeHead(400)
          .end(error instanceof Error ? error.message : 'Invalid theme.')
        return true
      }
      const saved = exportTheme(theme)
      // Serialize and atomically replace the authoritative file.
      const write = queue.then(async () => {
        await mkdir(dirname(themeFile), { recursive: true })
        const temporary = `${themeFile}.${randomUUID()}.tmp`
        await writeFile(temporary, JSON.stringify(saved, null, 2) + '\n')
        await rename(temporary, themeFile)
      })
      queue = write.catch(() => {})
      await write
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(saved))
    } else {
      res.setHeader('Allow', path === '/api/theme' ? 'GET, PUT' : 'GET')
      res.writeHead(405).end('Method not allowed.')
    }
  } catch {
    res.writeHead(500).end('Could not read or save the shared theme file.')
  }
  return true
}
