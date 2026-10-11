import { HamtryElement, emit, listen, required, useEffect } from '../core/index.js'
import { style } from './styles.js'

// Native dialog нь focus trap, Escape болон modal-ийн top layer-ийг хариуцна.
export class HamtryDialog extends HamtryElement {
  static observedAttributes = ['heading']
  render() {
    style(this.root)
    this.root.innerHTML = '<dialog class="ht-dialog" part="dialog" aria-labelledby="title"><header><h2 id="title"></h2><button type="button" class="ht-dialog-close" aria-label="Цонх хаах">×</button></header><div class="ht-dialog-body"><slot></slot></div></dialog>'
  }
  setup() {
    const dialog = required('dialog', this.root)
    useEffect(() => {
      this.attributesChanged.get()
      required('h2', this.root).textContent = this.getAttribute('heading') || ''
    })
    listen(required('button', this.root), 'click', () => this.close())
    listen(dialog, 'close', () => emit(this, 'hamtry-dialog-close', { value: dialog.returnValue }))
    listen(dialog, 'click', (event) => {
      const bounds = dialog.getBoundingClientRect()
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) this.close()
    })
  }
  get open() { return this.root.querySelector('dialog')?.open || false }
  showModal() {
    const dialog = required('dialog', this.root)
    if (!dialog.open) dialog.showModal()
  }
  close(value = '') { this.root.querySelector('dialog')?.close(value) }
}
