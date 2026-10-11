import { HamtryElement, emit, listen, required, useEffect } from '../core/index.js'
import { style } from './styles.js'

// Filter-ийн сонголт: keyboard-той native button, төлөв нь host property дээр.
export class HamtryChip extends HamtryElement {
  static observedAttributes = ['selected', 'disabled']
  get selected() { return this.hasAttribute('selected') }
  set selected(value) { this.toggleAttribute('selected', Boolean(value)) }
  render() {
    style(this.root)
    this.root.innerHTML = '<button class="ht-chip" part="button" type="button"><slot></slot></button>'
  }
  setup() {
    const button = required('button', this.root)
    useEffect(() => {
      this.attributesChanged.get()
      button.setAttribute('aria-pressed', String(this.selected))
      button.disabled = this.hasAttribute('disabled')
    })
    listen(button, 'click', () => {
      this.selected = !this.selected
      emit(this, 'hamtry-toggle', { selected: this.selected })
    })
  }
  focus(options) { this.root.querySelector('button')?.focus(options) }
}
