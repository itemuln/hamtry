import { Scope, signal } from './reactivity.js'
/**
 * Манай native компонентуудын суурь class.
 * DOM нэг удаа үүснэ; салгаад буцааж холбоход DOM ба төлөв хадгалагдана.
 * Харин listener/effect-ийн setup шинээр ажиллаж, давхар бүртгэл үүсэхгүй.
 */
export class HamtryElement extends HTMLElement {
  // open: DevTools болон shadowRoot-оор доторх DOM-ийг шалгаж болно.
  // delegatesFocus: host руу focus хийхэд доторх удирдлага focus авна.
  root = this.attachShadow({ mode: 'open', delegatesFocus: true })
  scope
  initialized = false
  attributesChanged = signal(0)
  // Дэд class DOM үүсгэх render()-ээ заавал хэрэгжүүлнэ.
  render() {
    throw new Error('HamtryElement subclasses must implement render().')
  }
  // Холбогдох болгонд event болон reactive binding-аа бүртгэнэ.
  setup() {}
  connectedCallback() {
    // Энэ callback-ийг browser өөрөө дуудна; хуудас гараар дуудахгүй.
    if (!this.isConnected || this.scope) return
    if (!this.initialized) {
      this.render()
      this.initialized = true
    }
    const scope = new Scope()
    this.scope = scope
    try {
      scope.run(() => this.setup())
    } catch (error) {
      this.scope = undefined
      scope.dispose()
      throw error
    }
  }
  disconnectedCallback() {
    // Салсан компонент window listener эсвэл timer-аа үлдээж болохгүй.
    const scope = this.scope
    this.scope = undefined
    scope?.dispose()
  }
  attributeChangedCallback() {
    // Зөвхөн дэд class-ийн observedAttributes-д байгаа өөрчлөлт энд ирнэ.
    // attributesChanged.get() уншдаг effect дараагийн microtask-д ажиллана.
    this.attributesChanged.set((value) => value + 1)
  }
}
