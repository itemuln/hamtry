import {
  HamtryElement,
  $,
  emit,
  listen,
  onCleanup,
  required,
  signal,
  useEffect,
} from '../core/index.js'
import { style } from './styles.js'
/** Native input-аа хадгалж keyboard/validation ашиглана; host нь form-д оролцоно. */
export class HamtryField extends HamtryElement {
  static formAssociated = true
  static observedAttributes = [
    'label',
    'name',
    'value',
    'checked',
    'disabled',
    'required',
    'readonly',
    'placeholder',
    'type',
    'helper',
    'error',
    'min',
    'max',
    'step',
    'minlength',
    'maxlength',
    'pattern',
  ]
  internals = this.attachInternals()
  fieldsetDisabled = false
  state = signal('')
  selection = signal(false)
  // value attribute нь анхны утга; .value property нь одоогийн утга.
  // Хэрэглэгч бичсэн утгыг өөр attribute өөрчлөгдөхөд дарж солихгүй.
  lastValueAttribute
  lastCheckedAttribute
  get value() {
    return this.state.get()
  }
  set value(value) {
    this.lastValueAttribute = this.getAttribute('value')
    this.state.set(String(value))
    this.sync()
  }
  get checked() {
    return this.selection.get()
  }
  set checked(value) {
    this.lastCheckedAttribute = this.hasAttribute('checked')
    this.selection.set(Boolean(value))
    if (value && this.kind === 'radio') this.uncheckGroup()
    this.sync()
  }
  get disabled() {
    return this.hasAttribute('disabled')
  }
  set disabled(value) {
    this.toggleAttribute('disabled', value)
  }
  get form() {
    return this.internals.form
  }
  get validity() {
    return this.internals.validity
  }
  get validationMessage() {
    return this.internals.validationMessage
  }
  checkValidity() {
    this.sync()
    return this.internals.checkValidity()
  }
  reportValidity() {
    this.sync()
    return this.internals.reportValidity()
  }
  focus(options) {
    this.root.querySelector('#control')?.focus(options)
  }
  render() {
    style(this.root)
    const choice = this.isChoice()
    const tag =
      this.kind === 'textarea'
        ? 'textarea'
        : this.kind === 'select'
          ? 'select'
          : 'input'
    this.root.innerHTML = `<div class="ht-field"><label for="control"><span id="label"></span></label><${tag} id="control" part="control" class="${choice ? '' : 'ht-input'}"></${tag}><p id="help" class="ht-field-help"></p>${this.kind === 'select' ? '<slot hidden></slot>' : ''}</div>`
    if (choice) {
      const label = required('label', this.root)
      label.className = 'ht-choice'
      label.prepend(required('#control', this.root))
      const input = required('#control', this.root)
      // Native checkbox/radio дүрслэлийг хадгалж, өнгийг токеноос авна.
      input.style.cssText =
        'position:static;opacity:1;inset:auto;accent-color:var(--brand-primary);width:var(--spacing-5);height:var(--spacing-5);flex-shrink:0'
      input.type = this.kind === 'radio' ? 'radio' : 'checkbox'
      if (this.kind === 'switch') input.setAttribute('role', 'switch')
    }
  }
  isChoice() {
    return ['checkbox', 'radio', 'switch'].includes(this.kind)
  }
  uncheckGroup() {
    // Shadow root бүр тусдаа тул radio бүлэглэлтийг host-уудын түвшинд хийнэ.
    const name = this.getAttribute('name')
    if (!name) return
    for (const radio of $('hamtry-radio', this.getRootNode())) {
      if (
        radio !== this &&
        radio.form === this.form &&
        radio.getAttribute('name') === name
      )
        radio.checked = false
    }
  }
  sync() {
    const control = this.root.querySelector('#control')
    if (!control) return
    control.disabled = this.disabled || this.fieldsetDisabled
    const choice = this.isChoice()
    if (choice) {
      control.checked = this.checked
      control.value = this.value || 'on'
    } else {
      control.value = this.value
      // Таарах option байхгүй бол native select шиг хоосон утгатай болно.
      if (this.kind === 'select') this.state.set(control.value)
    }
    const formValue = control.disabled
      ? null
      : choice
        ? this.checked
          ? this.value || 'on'
          : null
        : this.value
    // Эхний аргумент FormData-д орно; хоёр дахь нь browser restore хийх төлөв.
    this.internals.setFormValue(
      formValue,
      choice ? (this.checked ? 'checked' : 'unchecked') : this.value,
    )
    let requiredValue = this.hasAttribute('required')
    if (this.kind === 'radio' && this.getAttribute('name')) {
      const group = $('hamtry-radio', this.getRootNode()).filter(
        (radio) =>
          radio.form === this.form &&
          radio.getAttribute('name') === this.getAttribute('name') &&
          !radio.disabled &&
          !radio.fieldsetDisabled,
      )
      requiredValue =
        group.some((radio) => radio.hasAttribute('required')) &&
        !group.some((radio) => radio.checked)
      control.tabIndex = group.some((radio) => radio.checked)
        ? this.checked
          ? 0
          : -1
        : group[0] === this
          ? 0
          : -1
    }
    control.required = requiredValue
    const error = this.getAttribute('error')
    const flags = {}
    if (!control.disabled) {
      for (const key of [
        'valueMissing',
        'typeMismatch',
        'patternMismatch',
        'tooLong',
        'tooShort',
        'rangeUnderflow',
        'rangeOverflow',
        'stepMismatch',
        'badInput',
      ])
        flags[key] = control.validity[key]
      if (error) flags.customError = true
    }
    const invalid = Object.values(flags).some(Boolean)
    // Shadow input-ийн validation-ийг гаднах form шалгахын тулд host-д дамжуулна.
    this.internals.setValidity(
      invalid ? flags : {},
      invalid ? error || control.validationMessage : '',
      control,
    )
    control.setAttribute('aria-invalid', String(invalid))
    control.setAttribute('aria-describedby', 'help')
    const helper = required('#help', this.root)
    helper.textContent = error || this.getAttribute('helper') || ''
    helper.className = error ? 'ht-field-error' : 'ht-field-help'
    helper.hidden = !helper.textContent
  }
  setup() {
    const control = required('#control', this.root)
    if (this.kind === 'select') {
      const copyOptions = () => {
        // Гаднах option/optgroup-ийг native shadow select рүү хуулна.
        const select = control
        select.replaceChildren(
          ...$('option, optgroup', this)
            .filter((node) => node.parentNode === this)
            .map((node) => node.cloneNode(true)),
        )
        select.value =
          this.lastValueAttribute !== undefined
            ? this.value
            : (this.getAttribute('value') ?? select.value)
        this.state.set(select.value)
      }
      copyOptions()
      const observer = new MutationObserver(copyOptions)
      observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
      // Компонент салмагц DOM ажиглагч ажиллахаа зогсооно.
      onCleanup(() => observer.disconnect())
    }
    useEffect(() => {
      this.attributesChanged.get()
      required('#label', this.root).textContent =
        this.getAttribute('label') || ''
      control.name = this.getAttribute('name') || ''
      if (!this.isChoice() && control instanceof HTMLInputElement)
        control.type = this.getAttribute('type') || 'text'
      for (const name of [
        'placeholder',
        'min',
        'max',
        'step',
        'minlength',
        'maxlength',
        'pattern',
      ]) {
        const value = this.getAttribute(name)
        if (value === null) control.removeAttribute(name)
        else control.setAttribute(name, value)
      }
      if ('readOnly' in control)
        control.readOnly = this.hasAttribute('readonly')
      const valueAttribute = this.getAttribute('value')
      if (valueAttribute !== this.lastValueAttribute) {
        this.lastValueAttribute = valueAttribute
        if (valueAttribute !== null || this.kind !== 'select')
          this.state.set(valueAttribute || '')
      }
      const checkedAttribute = this.hasAttribute('checked')
      if (checkedAttribute !== this.lastCheckedAttribute) {
        this.lastCheckedAttribute = checkedAttribute
        this.checked = checkedAttribute
      }
      this.sync()
    })
    listen(control, 'input', () => {
      this.state.set(control.value)
      if (this.isChoice()) this.checked = control.checked
      this.sync()
    })
    listen(control, 'change', () => {
      this.state.set(control.value)
      if (this.isChoice()) this.checked = control.checked
      this.sync()
      // Native change shadow-ийн цаана үлдэх тул host-оос дахин дамжуулна.
      emit(this, 'change', { value: this.value, checked: this.checked })
    })
    if (this.kind === 'input')
      listen(control, 'keydown', (event) => {
        if (event.key !== 'Enter') return
        queueMicrotask(() => {
          if (!event.defaultPrevented && this.isConnected && !control.disabled)
            this.form?.requestSubmit()
        })
      })
    if (this.kind === 'radio')
      listen(control, 'keydown', (event) => {
        const key = event.key
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key))
          return
        const group = $('hamtry-radio', this.getRootNode()).filter(
          (radio) =>
            radio.form === this.form &&
            radio.getAttribute('name') === this.getAttribute('name') &&
            !radio.disabled &&
            !radio.fieldsetDisabled,
        )
        if (!this.getAttribute('name') || !group.length) return
        event.preventDefault()
        const index = group.indexOf(this)
        const next =
          group[
            (index +
              (['ArrowRight', 'ArrowDown'].includes(key) ? 1 : -1) +
              group.length) %
              group.length
          ]
        next.checked = true
        next.focus()
        emit(next, 'change', { value: next.value, checked: true })
      })
  }
  formDisabledCallback(disabled) {
    this.fieldsetDisabled = disabled
    this.attributesChanged.set((value) => value + 1)
    this.sync()
  }
  formResetCallback() {
    const options = Array.from(this.root.querySelector('select')?.options || [])
    const defaultOption =
      options.filter((option) => option.defaultSelected).at(-1) || options[0]
    this.state.set(
      this.getAttribute('value') ??
        (this.kind === 'select' ? defaultOption?.value || '' : ''),
    )
    this.checked = this.hasAttribute('checked')
    this.sync()
  }
  formStateRestoreCallback(state) {
    if (typeof state !== 'string') return
    if (this.isChoice()) this.checked = state === 'checked'
    else this.value = state
    this.sync()
  }
}
export class HamtryInput extends HamtryField {
  kind = 'input'
}
export class HamtryTextarea extends HamtryField {
  kind = 'textarea'
}
export class HamtrySelect extends HamtryField {
  kind = 'select'
}
export class HamtryCheckbox extends HamtryField {
  kind = 'checkbox'
}
export class HamtryRadio extends HamtryField {
  kind = 'radio'
}
export class HamtrySwitch extends HamtryField {
  kind = 'switch'
}
