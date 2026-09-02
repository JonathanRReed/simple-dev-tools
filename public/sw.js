/* global caches, clients, fetch, self, Request, Response, URL */

const CACHE_NAME = 'sdt-v1';

const PRECACHE_ASSETS = [
  '/',
  '/offline/',
  '/favicon.ico',
  '/simple_dev_tools_logo_assets/site.webmanifest',
  '/simple_dev_tools_logo_assets/favicon.ico',
  '/simple_dev_tools_logo_assets/favicon-16x16.png',
  '/simple_dev_tools_logo_assets/favicon-32x32.png',
  '/simple_dev_tools_logo_assets/apple-touch-icon.png',
  '/simple_dev_tools_logo_assets/android-chrome-192x192.png',
  '/simple_dev_tools_logo_assets/simple-dev-tools-favicon-512x512.png',
];

const NAVIGATION_TIMEOUT = 3000;

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            // Ignore individual precache failures so install is not blocked.
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never cache the service worker script itself; let the browser update check work.
  if (url.pathname === '/sw.js') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleNextStatic(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleStaticAsset(request));
  }
});

async function handleNavigation(request) {
  // Stale-while-revalidate: serve cached immediately if present.
  const cached = await caches.match(request);
  if (cached) {
    fetchAndCache(request).catch(() => {});
    return cached;
  }

  // Not cached: network-first with a timeout.
  try {
    const networkResponse = await withTimeout(fetch(request), NAVIGATION_TIMEOUT);
    if (networkResponse && networkResponse.ok) {
      await putInCache(request, networkResponse);
      return networkResponse;
    }
  } catch (error) {
    // Fall through to offline fallback.
  }

  // Network failed/timed out and no cache: show the offline page.
  const offline = await caches.match('/offline/');
  if (offline) {
    return offline;
  }

  return new Response('Offline. Please connect to the internet.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  });
}

async function handleNextStatic(request) {
  // Cache-first for immutable hashed Next.js assets.
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await putInCache(request, networkResponse);
    }
    return networkResponse;
  } catch (error) {
    const cachedFallback = await caches.match(request);
    return cachedFallback || new Response('Network unavailable', { status: 503 });
  }
}

async function handleStaticAsset(request) {
  // Stale-while-revalidate for same-origin fonts, images, etc.
  const cached = await caches.match(request);
  if (cached) {
    fetchAndCache(request).catch(() => {});
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await putInCache(request, networkResponse);
    }
    return networkResponse;
  } catch (error) {
    const cachedFallback = await caches.match(request);
    return cachedFallback || new Response('Network unavailable', { status: 503 });
  }
}

async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await putInCache(request, networkResponse);
    }
  } catch (error) {
    // Ignore background update failures.
  }
}

async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
