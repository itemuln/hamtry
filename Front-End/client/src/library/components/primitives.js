import {
  HamtryElement,
  emit,
  listen,
  required,
  useEffect,
} from '../core/index.js'
import { style } from './styles.js'
export class HamtryButton extends HamtryElement {
  // Shadow доторх button өөрөө гаднах form-д хамаарахгүй.
  // ElementInternals ашиглан custom host-оо form-той холбоно.
  static formAssociated = true
  static observedAttributes = [
    'variant',
    'size',
    'disabled',
    'loading',
    'type',
    'aria-label',
  ]
  internals = this.attachInternals()
  fieldsetDisabled = false
  get disabled() {
    return this.hasAttribute('disabled')
  }
  set disabled(value) {
    this.toggleAttribute('disabled', value)
  }
  get loading() {
    return this.hasAttribute('loading')
  }
  set loading(value) {
    this.toggleAttribute('loading', value)
  }
  render() {
    style(this.root)
    this.root.innerHTML =
      '<button part="button" type="button"><span class="ht-spinner" hidden aria-hidden="true">◌</span><slot></slot></button>'
  }
  setup() {
    const button = required('button', this.root)
    useEffect(() => {
      this.attributesChanged.get()
      const variant = this.getAttribute('variant') || 'primary'
      const size = this.getAttribute('size') || 'md'
      button.className = `ht-button ht-button--${variant} ht-button--${size}`
      button.disabled = this.disabled || this.loading || this.fieldsetDisabled
      button.setAttribute('aria-busy', String(this.loading))
      const label = this.getAttribute('aria-label')
      if (label) button.setAttribute('aria-label', label)
      else button.removeAttribute('aria-label')
      required('.ht-spinner', this.root).hidden = !this.loading
    })
    listen(button, 'click', (event) => {
      // Хуудасны click handler preventDefault() хийх боломжийг эхэлж олгоно.
      queueMicrotask(() => {
        const form = this.internals.form
        if (
          event.defaultPrevented ||
          button.disabled ||
          this.disabled ||
          this.loading ||
          this.fieldsetDisabled ||
          !this.isConnected ||
          !form
        )
          return
        if (this.getAttribute('type') === 'submit') form.requestSubmit()
        if (this.getAttribute('type') === 'reset') form.reset()
      })
    })
  }
  formDisabledCallback(disabled) {
    this.fieldsetDisabled = disabled
    this.attributesChanged.set((value) => value + 1)
  }
  focus(options) {
    this.root.querySelector('button')?.focus(options)
  }
}
export class HamtryBadge extends HamtryElement {
  static observedAttributes = ['tone']
  render() {
    style(this.root)
    this.root.innerHTML = '<span part="badge"><slot></slot></span>'
  }
  setup() {
    useEffect(() => {
      this.attributesChanged.get()
      required('span', this.root).className =
        `ht-badge ht-tone--${this.getAttribute('tone') || 'neutral'}`
    })
  }
}
export class HamtryAlert extends HamtryElement {
  // Хуудас текстээ slot-д өгнө; сан нь өнгө, байрлал, хаах үйлдлийг хариуцна.
  static observedAttributes = ['tone', 'heading', 'dismissible']
  render() {
    style(this.root)
    this.root.innerHTML =
      '<div part="alert" role="status"><div class="ht-alert-content"><strong></strong><p><slot></slot></p></div><button class="ht-icon-button" type="button" aria-label="Хаах">×</button></div>'
  }
  setup() {
    const container = required('div', this.root)
    const dismiss = required('button', this.root)
    useEffect(() => {
      this.attributesChanged.get()
      container.className = `ht-alert ht-tone--${this.getAttribute('tone') || 'info'}`
      required('strong', this.root).textContent =
        this.getAttribute('heading') || ''
      dismiss.hidden = !this.hasAttribute('dismissible')
    })
    listen(dismiss, 'click', () => {
      this.hidden = true
      emit(this, 'hamtry-dismiss', {})
    })
  }
}
