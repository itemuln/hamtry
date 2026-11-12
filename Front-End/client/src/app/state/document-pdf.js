export async function docxToPrintHtml(buffer) {
  const { renderAsync } = await import('docx-preview')
  const container = document.createElement('div'), styles = document.createElement('div')
  await renderAsync(buffer, container, styles, {
    className: 'contract-docx', inWrapper: true, useBase64URL: true,
    ignoreLastRenderedPageBreak: false, renderHeaders: true, renderFooters: true,
    renderFootnotes: true, renderEndnotes: true, renderAltChunks: false,
  })
  const page = container.querySelector('section.contract-docx')
  const dimension = value => /^[\d.]+(pt|px|in|mm|cm)$/.test(value) ? value : ''
  const width = dimension(page?.style.width || ''), height = dimension(page?.style.minHeight || page?.style.height || '')
  const paper = width && height ? `${width} ${height}` : 'A4'
  return `<!doctype html><html><head><meta charset="utf-8">${styles.innerHTML}<style>
    @page { size: ${paper}; margin: 0; }
    html, body { margin: 0; padding: 0; background: white; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .contract-docx-wrapper { display: block; padding: 0 !important; background: white !important; }
    section.contract-docx { margin: 0 !important; box-shadow: none !important; break-after: page; }
    section.contract-docx:last-child { break-after: auto; }
  </style></head><body>${container.innerHTML}</body></html>`
}
export function pdfFilename(name) { return name.replace(/\.docx$/i, '') + '.pdf' }