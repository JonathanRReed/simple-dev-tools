'use client';

import { useEffect } from 'react';

/** How long the pointer must rest on a link before its page is fetched. */
const DWELL_MS = 65;

/**
 * Fetches a page's HTML while the pointer is still on its link, so the click
 * that follows is answered from the browser's HTTP cache.
 *
 * Every link on this site is a full page load, and a document takes
 * 100-400 ms to start arriving from the host. Warmed, the same navigation
 * was measured at about 30 ms.
 *
 * This is a plain `fetch`, not `<link rel="prefetch">` or speculation rules.
 * Those mark the request `Sec-Purpose: prefetch`, and the host answers every
 * such request with a 503 unless the page is already in its edge cache, so
 * they never helped here. Only the HTML is fetched and nothing is executed,
 * so a warmed tool is not recorded as "recently opened".
 */
export function LinkWarmer() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const warmed = new Set<string>([window.location.pathname]);
    let timer: number | undefined;

    const target = (event: Event): string | null => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return null;
      const url = new URL(link.href, window.location.href);
      // Same-origin pages only: every route here ends in "/", files do not.
      if (url.origin !== window.location.origin || !url.pathname.endsWith('/')) return null;
      return url.pathname;
    };

    const warm = (path: string) => {
      if (warmed.has(path)) return;
      warmed.add(path);
      fetch(path, { credentials: 'same-origin', priority: 'low' } as RequestInit).catch(() => {
        // Offline or interrupted: let a later hover try again.
        warmed.delete(path);
      });
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const path = target(event);
      window.clearTimeout(timer);
      if (path) timer = window.setTimeout(() => warm(path), DWELL_MS);
    };
    // A finger gives no hover, but touchstart still precedes the tap by ~100 ms.
    const onTouchStart = (event: TouchEvent) => {
      const path = target(event);
      if (path) warm(path);
    };

    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  return null;
}
