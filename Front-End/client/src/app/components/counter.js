import {
  HamtryElement,
  $,
  bindText,
  emit,
  listen,
  onMount,
  required,
  useState,
} from '@hamtry/library'

export class HamtryCounter extends HamtryElement {
  // Class-ийн instance бүр шинэ state үүсгэнэ; хоёр тоолуур нэг утга хуваалцахгүй.
  state = useState(0)
  get count() {
    return this.state[0]()
  }
  set count(value) {
    this.state[1](value)
  }
  render() {
    this.root.innerHTML =
      '<style>:host{display:block}div{display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-3);padding:var(--spacing-4);border:var(--border-width) solid var(--border-default);border-radius:var(--radius-md)}output{min-width:var(--spacing-8);text-align:center;font-size:var(--type-heading-h3)}</style><div><hamtry-button variant="outline" aria-label="Бууруулах">−</hamtry-button><output aria-live="polite"></output><hamtry-button aria-label="Нэмэх">+</hamtry-button><hamtry-button variant="ghost">Шинэчлэх</hamtry-button></div>'
  }
  setup() {
    const [count, setCount] = this.state
    bindText(required('output', this.root), count)
    const buttons = $('hamtry-button', this.root)
    listen(buttons[0], 'click', () => setCount((previous) => previous - 1))
    listen(buttons[1], 'click', () => setCount((previous) => previous + 1))
    listen(buttons[2], 'click', () => setCount(0))
    // Салгах үед reactive binding болон window listener scope-тойгоо цэвэрлэгдэнэ.
    onMount(() => {
      emit(this, 'hamtry-counter-mounted', {})
    })
    listen(window, 'hamtry-reset-counters', () => setCount(0))
  }
}
