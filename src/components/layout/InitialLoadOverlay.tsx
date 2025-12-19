"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const FADE_DELAY_MS = 150;

export default function InitialLoadOverlay() {
  const [hydrated, setHydrated] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => setHidden(true), FADE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [hydrated]);

  if (hidden) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-300",
        hydrated && "opacity-0 pointer-events-none"
      )}
      aria-live="polite"
      aria-busy={!hydrated}
    >
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card/80 px-6 py-5 shadow-2xl">
        <div className="flex items-center gap-3 text-sm text-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Loading Simple Dev Tools…</span>
        </div>
        <p className="text-xs text-muted-foreground">Optimizing your workspace, just a moment.</p>
      </div>
    </div>
  );
}
