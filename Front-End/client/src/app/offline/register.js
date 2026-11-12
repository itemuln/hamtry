import './status.css'

// Dev/HMR хуудаст service worker бүртгэхгүй.
export async function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const banner = document.createElement('aside')
  banner.className = 'offline-status'; banner.setAttribute('aria-live', 'polite'); banner.hidden = true
  const text = document.createElement('span'), update = document.createElement('button')
  update.type = 'button'; update.textContent = 'Шинэчлэх'; update.hidden = true
  banner.append(text, update); document.body.append(banner)
  let waiting, reloadRequested = false
  const render = () => {
    banner.hidden = navigator.onLine && !waiting
    text.textContent = waiting ? 'Шинэ хувилбар бэлэн. Дуусаагүй ажлаа хадгалаад шинэчлээрэй.' : 'Офлайн · Хадгалсан мэдээллийг харуулж байна.'
    update.hidden = !waiting
  }
  window.addEventListener('online', render); window.addEventListener('offline', render)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadRequested) location.reload() })
  update.addEventListener('click', () => {
    reloadRequested = true
    // Өөр tab аль хэдийн идэвхжүүлсэн бол зөвхөн энэ tab-ийг шинэчилнэ.
    if (waiting?.state === 'activated' || waiting?.state === 'redundant') location.reload()
    else waiting?.postMessage({ type: 'ACTIVATE_UPDATE' })
  })
  render()
  try {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
    const offer = worker => { if (worker && navigator.serviceWorker.controller) { waiting = worker; render() } }
    offer(registration.waiting)
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(registration.waiting) })
    })
  } catch { /* Cache хаалттай үед online app хэвийн ажиллана. */ }
}
