'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * A back-to-top key that appears after the user scrolls past roughly one
 * viewport; hidden until needed.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }}
      aria-label="Back to top"
      className="key fixed bottom-5 right-5 z-40 flex size-11 items-center justify-center rounded-full text-secondary-foreground"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
