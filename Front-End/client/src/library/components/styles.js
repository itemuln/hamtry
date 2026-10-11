import componentsCss from '../design-system/components.css?inline'
// Бүх instance нэг stylesheet-ийг хуваалцана. Instance бүрд CSS хуулж үүсгэхгүй.
// Өнгө, хэмжээний утгыг энд хуулдаггүй; design system-ийн var(--...) хэрэглэнэ.
const sheet = new CSSStyleSheet()
sheet.replaceSync(`
  :host { display: inline-block; font-family: var(--font-sans); color: var(--text-primary); max-width: 100%; }
  :host([hidden]), [hidden] { display: none !important; }
  *, *::before, *::after { box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
  ${componentsCss}
`)
export function style(root) {
  // Page-ийн ердийн CSS shadow дотор орохгүй тул shared sheet-ийг энд холбоно.
  root.adoptedStyleSheets = [sheet]
}
