import { onCleanup, useEffect } from './reactivity.js'
/** Бүх таарсан элементийг энгийн array болгоно. root нь хайх хүрээг заана. */
export function $(selector, root = document) {
  return Array.from(root.querySelectorAll(selector))
}
/** Эхний таарсан элемент; олдохгүй бол null. */
export function query(selector, root = document) {
  return root.querySelector(selector)
}
/** Компонентод заавал байх элемент алга бол ойлгомжтой алдаа өгнө. */
export function required(selector, root) {
  const element = query(selector, root)
  if (!element) throw new Error(`Missing component element: ${selector}`)
  return element
}
/** Listener бүртгээд устгах функц буцаана; caller өөрөө cleanup-ийг хариуцна. */
export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options)
  return () => target.removeEventListener(event, handler, options)
}
/** on()-той адил, гэхдээ listener-ийг одоогийн scope автоматаар устгана. */
export function listen(target, event, handler, options) {
  const dispose = on(target, event, handler, options)
  onCleanup(dispose)
  return dispose
}
/** Getter-ийн утга өөрчлөгдөхөд textContent шинэчилнэ; HTML оруулахгүй. */
export function bindText(node, read) {
  return useEffect(() => {
    node.textContent = String(read() ?? '')
  })
}
/** Event нь дээш дамжиж, Shadow DOM-ийн хилээр гарч хэрэглэгч хуудсанд хүрнэ. */
export function emit(target, name, detail) {
  return target.dispatchEvent(
    new CustomEvent(name, { detail, bubbles: true, composed: true }),
  )
}
