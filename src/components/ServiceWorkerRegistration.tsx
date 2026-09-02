'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
    if (!isLocalhost && location.protocol !== 'https:') {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Swallow registration errors silently.
    });
  }, []);

  return null;
}
