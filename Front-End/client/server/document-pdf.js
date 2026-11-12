import sanitizeHtml from 'sanitize-html'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
const LIMIT = 40 * 1024 * 1024
const json = (res, status, error) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error })) }
export function sanitizePrintHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'html', 'head', 'body', 'meta', 'style', 'section', 'article', 'header', 'footer', 'img', 'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'clipPath', 'image', 'use'],
    allowedAttributes: {
      '*': ['class', 'style', 'id', 'dir', 'lang', 'title'], meta: ['charset'], a: ['href', 'name'],
      img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
      svg: ['viewBox', 'width', 'height', 'xmlns'], g: ['transform', 'fill', 'stroke', 'clip-path'],
      path: ['d', 'fill', 'stroke', 'stroke-width', 'transform'], rect: ['x','y','width','height','fill','stroke'],
      image: ['href','xlink:href','x','y','width','height'], use: ['href','xlink:href'],
      text: ['x','y','fill','font-family','font-size'], tspan: ['x','y','dx','dy'],
    },
    allowedSchemes: ['data', 'http', 'https'], allowedSchemesByTag: { img: ['data'], image: ['data'] },
    allowVulnerableTags: true,
  })
}
export async function renderPdf(html) {
  const { default: puppeteer } = await import('puppeteer')
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  if (!executablePath) {
    const pinned = await puppeteer.executablePath()
    if (existsSync(pinned)) executablePath = pinned
    else {
      // Reuse an installed Chrome when the exact bundled revision is not installed.
      const cache = join(homedir(), '.cache', 'puppeteer', 'chrome')
      if (existsSync(cache)) for (const version of readdirSync(cache).sort((a,b) => b.localeCompare(a, undefined, { numeric: true }))) {
        const candidate = join(cache, version, 'chrome-linux64', 'chrome')
        if (existsSync(candidate)) { executablePath = candidate; break }
      }
    }
  }
  const browser = await puppeteer.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', request => {
      if (/^(data:|about:blank$)/.test(request.url())) void request.continue()
      else void request.abort()
    })
    await page.setContent(sanitizePrintHtml(html), { waitUntil: 'load', timeout: 30000 })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(Array.from(document.images).map(image => image.complete ? undefined : new Promise(resolve => { image.onload = resolve; image.onerror = resolve })))
    })
    return await page.pdf({ printBackground: true, preferCSSPageSize: true, waitForFonts: true, timeout: 30000 })
  } finally { await browser.close() }
}
export function createPdfRoute({ render = renderPdf } = {}) {
  let busy = false
  return (req, res) => {
    if (new URL(req.url, 'http://hamtry.site').pathname !== '/api/documents/pdf') return false
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); json(res,405,'Зөвхөн POST хүсэлт хүлээн авна.'); return true }
    if (req.headers.origin) {
      let sameOrigin = false
      try { sameOrigin = new URL(req.headers.origin).host === req.headers.host } catch { /* Reject malformed origins. */ }
      if (!sameOrigin) { json(res,403,'Энэ хүсэлт зөвшөөрөгдөөгүй.'); return true }
    }
    if (!(req.headers['content-type'] || '').startsWith('application/json')) { json(res,415,'JSON өгөгдөл шаардлагатай.'); return true }
    if (busy) { json(res,503,'Өөр PDF боловсруулж байна. Түр хүлээгээд дахин оролдоно уу.'); return true }
    busy = true
    void (async () => {
      try {
        const chunks = []; let size = 0
        for await (const chunk of req) { size += chunk.length; if (size > LIMIT) { json(res,413,'Баримт бичиг PDF болгоход хэт том байна.'); return }; chunks.push(chunk) }
        let payload
        try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { json(res,400,'Өгөгдөл буруу байна.'); return }
        if (typeof payload?.html !== 'string' || !payload.html.trim()) { json(res,400,'Хөрвүүлэх баримт бичиг алга.'); return }
        const pdf = await render(payload.html)
        res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': "attachment; filename=contract.pdf; filename*=UTF-8''" + encodeURIComponent(String(payload.filename || 'contract.pdf').replace(/[\r\n]/g,'').slice(0,180)), 'Cache-Control': 'no-store', 'Content-Length': pdf.byteLength })
        res.end(Buffer.from(pdf))
      } catch (error) {
        console.error('Contract PDF conversion failed:', error.message)
        if (!res.headersSent) json(res,500,'PDF үүсгэж чадсангүй. Серверийн Chromium/Puppeteer тохиргоог шалгаад дахин оролдоно уу.')
        else res.end()
      } finally { busy = false }
    })()
    return true
  }
}
export const pdfRoute = createPdfRoute()