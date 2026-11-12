/* global __HAMTRY_VERSION__, __HAMTRY_SHELL__ */
// Build нь хувилбар болон app shell-ийн manifest-ийг оруулна. API/хувийн өгөгдөл cache-д орохгүй.
const VERSION = __HAMTRY_VERSION__
const SHELL = __HAMTRY_SHELL__
const shellCache = `hamtry-shell-${VERSION}`, assetCache = `hamtry-assets-${VERSION}`
const localUrl = path => new URL(path, self.registration.scope).href
self.addEventListener('install', event => {
  event.waitUntil(caches.open(shellCache).then(cache => cache.addAll(SHELL.map(localUrl))))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => /^hamtry-(shell|assets)-/.test(key) && ![shellCache, assetCache].includes(key)).map(key => caches.delete(key)))))
})
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') void self.skipWaiting() })
async function publicAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic' && !response.headers.get('cache-control')?.includes('no-store')) {
    const size = Number(response.headers.get('content-length'))
    // Том ML binary болон хязгааргүй cache өсөлтөөс зайлсхийнэ.
    if (size > 0 && size <= 6 * 1024 * 1024) {
      const cache = await caches.open(assetCache)
      await cache.put(request, response.clone())
      const keys = await cache.keys()
      for (const key of keys.slice(0, Math.max(0, keys.length - 48))) await cache.delete(key)
    }
  }
  return response
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url), scope = new URL(self.registration.scope)
  if (event.request.method !== 'GET' || url.origin !== scope.origin || url.search) return
  const path = url.pathname.slice(scope.pathname.length)
  if (event.request.mode === 'navigate' && ['', 'index.html', 'explore.html'].includes(path)) {
    // HTML болон hashed asset нь нэг build-ийнх байна. Шинэ build-ийг зөвшөөрсний дараа идэвхжүүлнэ.
    event.respondWith(caches.open(shellCache).then(async cache => (await cache.match(localUrl(path || 'index.html'))) || fetch(event.request)))
  } else if (path.startsWith('assets/') || path.startsWith('models/')) {
    event.respondWith(publicAsset(event.request))
  }
})
