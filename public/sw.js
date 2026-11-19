/* global caches, clients, fetch, self, Request, Response, URL */

const CACHE_NAME = 'sdt-v5';

const PRECACHE_ASSETS = [
  '/',
  '/offline/',
  '/favicon.ico',
  '/simple_dev_tools_logo_assets/site.webmanifest',
  '/simple_dev_tools_logo_assets/favicon.ico',
  '/simple_dev_tools_logo_assets/icon.svg',
  '/simple_dev_tools_logo_assets/favicon-16x16.png',
  '/simple_dev_tools_logo_assets/favicon-32x32.png',
  '/simple_dev_tools_logo_assets/apple-touch-icon.png',
  '/simple_dev_tools_logo_assets/android-chrome-192x192.png',
  '/simple_dev_tools_logo_assets/simple-dev-tools-favicon-512x512.png',
];

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
    event.respondWith(handleNavigation(request, event));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleNextStatic(request, event));
    return;
  }

  if (url.origin === self.location.origin) {
    const versionSensitive = ['script', 'worker', 'sharedworker'].includes(request.destination) || request.headers.get('RSC') === '1' || url.pathname.endsWith('.txt');
    event.respondWith(versionSensitive ? handleFreshAsset(request, event) : handleStaticAsset(request, event));
  }
});

async function handleNavigation(request, event) {
  // Network-first for HTML: a stale shell can reference _next/static chunks
  // that no longer exist after a deploy, so fresh HTML always wins when the
  // network is available. The cache is the offline fallback.
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Storage exhaustion must never turn a successful request into an offline page.
      cacheInBackground(event, request, networkResponse);
    }
    // HTTP errors are real responses, not evidence that the browser is offline.
    return networkResponse;
  } catch {
    // Only a failed network request should enter the offline fallback.
  }

  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  // Nothing cached either: show the offline page.
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

async function handleNextStatic(request, event) {
  // Cache-first for immutable hashed Next.js assets.
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cacheInBackground(event, request, networkResponse);
    }
    return networkResponse;
  } catch (error) {
    const cachedFallback = await caches.match(request);
    return cachedFallback || new Response('Network unavailable', { status: 503 });
  }
}

async function handleFreshAsset(request, event) {
  // Unhashed worker scripts and App Router payloads must agree with the current deployment.
  try {
    const response = await fetch(request);
    if (response.ok) cacheInBackground(event, request, response);
    return response;
  } catch {
    return await caches.match(request) || new Response('Network unavailable', { status: 503 });
  }
}

async function handleStaticAsset(request, event) {
  // Stale-while-revalidate for same-origin fonts, images, etc.
  const cached = await caches.match(request);
  if (cached) {
    keepAlive(event, fetchAndCache(request).catch(() => {}));
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cacheInBackground(event, request, networkResponse);
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

// Let the worker stay alive until `work` settles, without making the page wait for it.
function keepAlive(event, work) {
  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(work);
  }
}

// Store a copy of `response` without holding the response back.
//
// The copy is taken now, before the page starts reading the body, and written
// while the page is already using the original. Awaiting the write instead
// (as this worker used to) meant a document or script was only handed to the
// page once it had been downloaded in full and saved, which defeats streaming
// and measured 100-200 ms slower per navigation. A failed write (quota, an
// aborted download) is ignored: the page already has its response.
function cacheInBackground(event, request, response) {
  let copy;
  try {
    copy = response.clone();
  } catch {
    return;
  }
  keepAlive(event, putInCache(request, copy).catch(() => {}));
}

async function putInCache(request, response) {
  if (new URL(typeof request === 'string' ? request : request.url, self.location.origin).search) return;
  const cache = await caches.open(CACHE_NAME);
  // The caller hands over a response it is not going to read itself.
  await cache.put(request, response);
}
