import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable, Writable } from 'node:stream'
import { once } from 'node:events'
import { createPdfRoute, sanitizePrintHtml } from '../server/document-pdf.js'
function invoke(route, { method = 'POST', headers = {}, body = { html: '<p>Гэрээ</p>', filename: 'гэрээ.pdf' } } = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]); req.url = '/api/documents/pdf'; req.method = method
  req.headers = { host: 'localhost:5173', 'content-type': 'application/json', ...headers }
  const chunks = [], values = {}
  const res = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done() } })
  res.setHeader = (key, value) => { values[key.toLowerCase()] = value }
  res.writeHead = (status, headers = {}) => { res.statusCode = status; for (const [key,value] of Object.entries(headers)) res.setHeader(key,value); return res }
  const finished = once(res, 'finish').then(() => ({ status: res.statusCode, headers: values, data: Buffer.concat(chunks) }))
  assert.equal(route(req,res), true)
  return finished
}
test('PDF route returns downloadable PDF bytes and rejects unsupported requests', async () => {
  let calls = 0
  const route = createPdfRoute({ render: async html => { calls++; assert.ok(html.includes('Гэрээ')); return Buffer.from('%PDF-1.7\nfixture') } })
  assert.equal((await invoke(route, { method: 'GET' })).status,405)
  assert.equal((await invoke(route, { headers: { 'content-type': 'text/html' } })).status,415)
  assert.equal((await invoke(route, { headers: { origin: 'https://other.example' } })).status,403)
  assert.equal((await invoke(route, { headers: { origin: 'invalid' } })).status,403)
  assert.equal((await invoke(route, { body: { html: '' } })).status,400)
  const result = await invoke(route)
  assert.equal(result.status,200); assert.equal(result.headers['content-type'],'application/pdf')
  assert.ok(result.headers['content-disposition'].includes(encodeURIComponent('гэрээ.pdf')))
  assert.ok(result.data.toString().startsWith('%PDF-')); assert.equal(calls,1)
})
test('PDF conversion is bounded to one active job and recovers after completion', async () => {
  let release
  const waiting = new Promise(resolve => { release = resolve })
  const route = createPdfRoute({ render: () => waiting })
  const first = invoke(route)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal((await invoke(route)).status,503)
  release(Buffer.from('%PDF')); assert.equal((await first).status,200)
  assert.equal((await invoke(route)).status,200)
})
test('print HTML keeps document styles and embedded images while stripping active content', () => {
  const safe = sanitizePrintHtml('<html><head><style>@page {size:A4} p{color:red}</style></head><body><p onclick="alert(1)">Гэрээ</p><script>alert(1)</script><iframe src="file:///etc/passwd"></iframe><img src="https://example.com/pixel"><img src="data:image/png;base64,AAAA"></body></html>')
  assert.ok(safe.includes('@page')); assert.ok(safe.includes('Гэрээ')); assert.ok(safe.includes('data:image/png'))
  assert.ok(!safe.includes('<script')); assert.ok(!safe.includes('onclick')); assert.ok(!safe.includes('<iframe')); assert.ok(!safe.includes('https://example.com'))
})