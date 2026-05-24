// Asset paths are injected at build time by the injectSWAssets Vite plugin.
// In dev the placeholder stays; SW is not registered in dev.
const CACHE_NAME = 'estimateflow-shell-v1'
const SHELL_ASSETS = self.__SW_ASSET_MANIFEST__ || []

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(['/', ...SHELL_ASSETS]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Pass through: API routes and cross-origin requests
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return
  }

  // Navigation requests: network-first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }

  // Hashed shell assets: cache-first
  if (SHELL_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
    return
  }

  // Everything else (Supabase, AI calls, images): network only
})
