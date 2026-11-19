"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

type ToolLoadingProps = {
  message: string;
};

/**
 * Placeholder rendered while a tool's client bundle loads. It mirrors the
 * ToolShell layout (faceplate + two wells) so the page doesn't jump when the
 * real surface swaps in, and announces progress politely.
 */
export default function ToolLoading({ message }: ToolLoadingProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="panel" aria-live="polite" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="led-off animate-pulse" aria-hidden="true" />
          {message}
        </span>
        <div className="flex items-center gap-2" aria-hidden="true">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2" aria-hidden="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      </div>
      {showHint ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-5">
          Loading this tool&rsquo;s code. It is cached after the first visit.
        </p>
      ) : null}
    </section>
  );
}
