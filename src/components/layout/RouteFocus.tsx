'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * On client-side navigation, move focus to the main content region and reset
 * scroll to the top so keyboard and screen-reader users land on the new page
 * (Next's default focus handling doesn't reliably target this custom shell).
 * Skips the initial mount so the page load doesn't bypass the skip link.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0 });
    main?.scrollTo?.({ top: 0, left: 0 });
  }, [pathname]);

  return null;
}
