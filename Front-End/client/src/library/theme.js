import { emptyOverrides, themeCss } from './design-system/theme.js'
/**
 * Сангийн компонентуудад хэрэгтэй анхны токенуудыг document дээр байрлуулна.
 * Нэг хуудсанд дахин дуудсан ч давхар stylesheet үүсгэхгүй.
 * Эхэнд байрлуулснаар дараа нь ачаалагдсан хадгалсан theme давуу үйлчилнэ.
 */
export function applyDefaultTheme() {
  const existing = document.querySelector('style[data-hamtry-defaults]')
  if (existing) return existing
  const defaults = document.createElement('style')
  defaults.dataset.hamtryDefaults = 'true'
  defaults.textContent = themeCss(emptyOverrides())
  document.head.prepend(defaults)
  return defaults
}
