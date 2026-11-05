import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

test('all app UI token references resolve through the shared token stylesheet', async () => {
  const tokenFile = new URL('../src/library/design-system/ui-tokens.css', import.meta.url)
  const source = await readFile(tokenFile, 'utf8')
  const definitions = new Set([...source.matchAll(/(--ui-[\w-]+)\s*:/g)].map(match => match[1]))
  const app = new URL('../src/app/', import.meta.url)
  const files = (await readdir(app, { recursive: true })).filter(file => file.endsWith('.css'))
  const styles = await Promise.all(files.map(async file => [file, await readFile(new URL(file, app), 'utf8')]))
  const missing = []
  for (const [file, css] of [...styles, ['ui-tokens.css', source]]) {
    for (const match of css.matchAll(/var\((--ui-[\w-]+)/g)) {
      if (!definitions.has(match[1])) missing.push(`${file}: ${match[1]}`)
    }
  }
  assert.deepEqual(missing, [], 'shared UI tokens must not leave unresolved component styles')
  assert.match(await readFile(new URL('../src/library/design-system/tokens.css', import.meta.url), 'utf8'), /@import ['"]\.\/ui-tokens\.css['"]/)
})
