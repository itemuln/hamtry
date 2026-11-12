import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { offlineBuild } from '../server/offline-build.js'

test('offline manifest includes shell dependencies, excludes editor and lazy ML assets', () => {
  let emitted
  offlineBuild().generateBundle.call({ emitFile(value) { emitted = value } }, {}, {
    'index.html': { source: '<script src="/assets/app.js"></script><link href="/assets/app.css">' },
    'explore.html': { source: '<script src="/assets/app.js"></script>' },
    'assets/app.js': { type: 'chunk', imports: ['assets/library.js'], dynamicImports: ['assets/face.js'] },
    'assets/library.js': { type: 'chunk', imports: [] },
    'assets/app.css': { type: 'asset' },
    'assets/face.js': { type: 'chunk', imports: [] },
    'assets/editor.js': { type: 'chunk', imports: [] },
  })
  assert.equal(emitted.fileName, 'sw.js')
  const source = emitted.source
  assert.match(source, /const VERSION = "[a-f0-9]+"/)
  assert.match(source, /const SHELL = .*assets\/library.js/)
  assert.doesNotMatch(source, /"assets\/(face|editor).js"/)
  assert.doesNotThrow(() => new vm.Script(source))
})
test('service worker bypasses verification, private APIs and external map tiles', () => {
  const handlers = new Map()
  const source = readFileSync(new URL('../src/app/offline/service-worker.js', import.meta.url), 'utf8')
  const context = {
    __HAMTRY_VERSION__: 'test', __HAMTRY_SHELL__: ['index.html'], URL,
    self: { registration: { scope: 'https://hamtry.test/' }, addEventListener(type, handler) { handlers.set(type, handler) } },
  }
  vm.runInNewContext(source, context)
  for (const url of ['https://hamtry.test/api/liveness/verify', 'https://hamtry.test/api/listings', 'https://tiles.openfreemap.org/tile.pbf', 'https://hamtry.test/editor.html', 'https://hamtry.test/assets/a.js?private=1']) {
    let intercepted = false
    handlers.get('fetch')({ request: { method: 'GET', mode: 'navigate', url }, respondWith() { intercepted = true } })
    assert.equal(intercepted, false, url)
  }
})
