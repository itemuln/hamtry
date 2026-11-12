import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export function offlineBuild() {
  return {
    name: 'hamtry-offline-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const shell = new Set(['index.html', 'explore.html'])
      const visit = name => {
        if (shell.has(name)) return
        const item = bundle[name]
        if (!item) return
        shell.add(name)
        if (item.type === 'chunk') {
          for (const dependency of item.imports) visit(dependency)
          for (const css of item.viteMetadata?.importedCss || []) visit(css)
        }
      }
      for (const name of ['index.html', 'explore.html']) {
        const html = String(bundle[name]?.source || '')
        for (const match of html.matchAll(/(?:src|href)="[^"\s]*?(assets\/[^"\s]+)"/g)) visit(match[1])
      }
      for (const [name, item] of Object.entries(bundle)) {
        if (/assets\/(source-sans-3|literata).*\.woff2$/.test(name) || /assets\/(property-source.*\.png|roommate.*\.jpg)$/.test(name) || item.facadeModuleId?.endsWith('/offline/register.js')) visit(name)
      }
      const template = readFileSync(new URL('../src/app/offline/service-worker.js', import.meta.url), 'utf8')
      const version = createHash('sha256').update([...Object.keys(bundle)].sort().join('|') + String(bundle['index.html']?.source) + template).digest('hex').slice(0, 16)
      const source = template
        .replace('const VERSION = __HAMTRY_VERSION__', `const VERSION = ${JSON.stringify(version)}`)
        .replace('const SHELL = __HAMTRY_SHELL__', `const SHELL = ${JSON.stringify([...shell])}`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}
