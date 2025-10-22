"use client";

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type NavigationProgressContextValue = {
  start: () => void;
  stop: () => void;
  isNavigating: boolean;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 280;
const FAILSAFE_TIMEOUT_MS = 10000;

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const isNavigatingRef = useRef(isNavigating);
  const pendingTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const failsafeTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  const clearPending = useCallback(() => {
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  const clearHide = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const clearFailsafe = useCallback(() => {
    if (failsafeTimeoutRef.current !== null) {
      window.clearTimeout(failsafeTimeoutRef.current);
      failsafeTimeoutRef.current = null;
    }
  }, []);

  const beginNavigation = useCallback(() => {
    clearHide();
    startTimeRef.current = performance.now();
    setIsNavigating(true);
    clearFailsafe();
    failsafeTimeoutRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      failsafeTimeoutRef.current = null;
    }, FAILSAFE_TIMEOUT_MS);
  }, [clearFailsafe, clearHide]);

  const start = useCallback(() => {
    clearPending();

    if (isNavigatingRef.current) {
      beginNavigation();
      return;
    }

    pendingTimeoutRef.current = window.setTimeout(() => {
      pendingTimeoutRef.current = null;
      beginNavigation();
    }, SHOW_DELAY_MS);
  }, [beginNavigation, clearPending]);

  const stop = useCallback(() => {
    clearPending();

    if (!isNavigatingRef.current) {
      clearFailsafe();
      clearHide();
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    clearFailsafe();
    clearHide();

    if (remaining <= 0) {
      setIsNavigating(false);
      return;
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      hideTimeoutRef.current = null;
    }, remaining);
  }, [clearFailsafe, clearHide, clearPending]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const current = window.location;
      const sameRoute = url.pathname === current.pathname && url.search === current.search;
      if (sameRoute) return;

      start();
    };

    const handlePopState = () => {
      start();
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [start]);

  useEffect(() => {
    stop();
  }, [pathname, stop]);

  useEffect(() => {
    return () => {
      clearPending();
      clearHide();
      clearFailsafe();
    };
  }, [clearFailsafe, clearHide, clearPending]);

  const value = useMemo(
    () => ({
      start,
      stop,
      isNavigating,
    }),
    [start, stop, isNavigating]
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);

  if (!context) {
    throw new Error("useNavigationProgress must be used within a NavigationProgressProvider");
  }

  return context;
}

export function NavigationProgressBar() {
  const { isNavigating } = useNavigationProgress();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1">
      <div
        className={cn(
          'h-full origin-left rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/40 transform transition-opacity duration-200 will-change-transform',
          isNavigating
            ? 'opacity-100 motion-safe:animate-[nav-progress_1.2s_cubic-bezier(0.4,0,0.2,1)_infinite]'
            : 'opacity-0'
        )}
        aria-hidden="true"
      />
    </div>
  );
}
