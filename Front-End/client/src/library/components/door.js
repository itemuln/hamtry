import { HamtryElement, emit, listen, onCleanup, required } from '../core/index.js'
import css from './door.css?inline'

const sheet = new CSSStyleSheet()
sheet.replaceSync(css)

// A real button owns keyboard activation; the panel is only the visual surface.
export class HamtryDoor extends HamtryElement {
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `<button type="button" aria-label="Хаалгыг тогшоод орох" aria-expanded="false"><span class="frame" aria-hidden="true"><span class="panel"><b>24</b><i class="handle"></i><span class="rule"></span></span></span><span class="label">Хаалгыг тогшоод орох</span></button>`
  }
  setup() {
    const button = required('button', this.root)
    listen(button, 'click', () => {
      if (this.hasAttribute('opening')) return
      this.setAttribute('opening', '')
      button.setAttribute('aria-expanded', 'true')
      emit(this, 'hamtry-door-opening')
      this.openTimer = setTimeout(() => emit(this, 'hamtry-door-open'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 900)
    })
    onCleanup(() => this.reset())
  }
  reset() {
    clearTimeout(this.openTimer)
    this.removeAttribute('opening')
    this.root.querySelector('button')?.setAttribute('aria-expanded', 'false')
  }
}
