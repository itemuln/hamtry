// Framework independent: load once in any Hamtry page, before your components.
const endpoint = new URL('./hamtry-theme.css', import.meta.url)
const style = document.createElement('style')
style.dataset.hamtrySharedTheme = 'true'
document.head.append(style)
let previous = ''
async function refresh() {
  try {
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (!response.ok)
      throw new Error(`Shared theme request failed (${response.status}).`)
    const css = await response.text()
    if (css !== previous) {
      style.textContent = css
      previous = css
      window.dispatchEvent(new CustomEvent('hamtry-theme-change'))
    }
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent('hamtry-theme-error', { detail: error }),
    )
  }
}
await refresh()
setInterval(refresh, 2000)
