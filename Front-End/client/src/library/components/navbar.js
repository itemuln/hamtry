import { HamtryElement, signal, useEffect, required } from '../core/index.js'
import css from './navbar.css?inline'
const sheet = new CSSStyleSheet(); sheet.replaceSync(css)
const icons = {
  home: '<path d="m3 10 9-7 9 7v11h-6v-8H9v8H3Z"/>',
  document: '<path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 13h8M8 17h6"/>',
  chat: '<path d="M21 12a8 8 0 0 1-8 8H8l-5 2V11a9 9 0 0 1 18 1Z"/><path d="M8 10h8M8 14h5"/>',
}
export class HamtryNavbar extends HamtryElement {
  static observedAttributes = ['active', 'label']
  entries = signal([])
  get items() { return this.entries.get() }
  set items(value) { this.entries.set(Array.isArray(value) ? value : []) }
  get active() { return this.getAttribute('active') || '' }
  set active(value) { this.setAttribute('active', value) }
  render() { this.root.adoptedStyleSheets = [sheet]; this.root.innerHTML = '<nav part="nav"></nav>' }
  setup() {
    const nav = required('nav', this.root)
    let previous
    useEffect(() => {
      const items = this.items
      this.attributesChanged.get()
      nav.setAttribute('aria-label', this.getAttribute('label') || 'Үндсэн цэс')
      if (previous !== items) {
        nav.replaceChildren(...items.map(item => {
          const link = document.createElement('a'); link.href = item.href; link.dataset.id = item.id; link.setAttribute('part', 'link')
          if (icons[item.icon]) { const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true'); icon.innerHTML = icons[item.icon]; link.append(icon) }
          const text = document.createElement('span'); text.textContent = item.label; link.append(text)
          return link
        }))
        previous = items
      }
      for (const link of nav.children) {
        if (link.dataset.id === this.active) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      }
    })
  }
}