import { HamtryElement, createMotion, emit, listen, onCleanup, required, useEffect } from '../core/index.js'
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
    this.motion = createMotion()
    this.closing = false
    onCleanup(() => { this.closing = false; this.motion = undefined; dialog.close() })
    useEffect(() => {
      this.attributesChanged.get()
      required('h2', this.root).textContent = this.getAttribute('heading') || ''
    })
    listen(required('button', this.root), 'click', () => this.close())
    listen(dialog, 'cancel', event => { event.preventDefault(); this.close() })
    listen(dialog, 'close', () => emit(this, 'hamtry-dialog-close', { value: dialog.returnValue }))
    listen(dialog, 'click', (event) => {
      const bounds = dialog.getBoundingClientRect()
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) this.close()
    })
  }
  get open() { return Boolean(this.root.querySelector('dialog')?.open && !this.closing) }
  showModal() {
    const dialog = required('dialog', this.root)
    if (dialog.open && !this.closing) return
    this.closing = false
    if (!dialog.open) dialog.showModal()
    this.motion?.play(dialog, { opacity: [.7, 1], transform: ['translateY(10px) scale(.99)', 'none'] }, { duration: 220 })
  }
  close(value = '') {
    const dialog = this.root.querySelector('dialog')
    if (!dialog?.open || this.closing) return
    if (!this.motion || !this.isConnected) { dialog.close(value); return }
    this.closing = true
    this.motion.play(dialog, { opacity: [1, 0], transform: ['none', 'translateY(6px) scale(.995)'] }, {
      duration: 130,
      onComplete: () => { this.closing = false; dialog.close(value) },
    })
  }
}
