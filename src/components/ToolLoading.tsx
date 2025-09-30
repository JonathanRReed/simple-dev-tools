"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import ToolPage from "@/components/layout/ToolPage";

type ToolLoadingProps = {
  message: string;
};

export default function ToolLoading({ message }: ToolLoadingProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <div
        className="rounded-3xl border border-rp-highlight-high bg-rp-overlay/70 p-8 text-sm text-rp-subtle shadow-lg flex flex-col items-center gap-4"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center gap-3 text-rp-text">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{message}</span>
        </div>
        {showHint && (
          <p className="text-xs text-muted-foreground/80 text-center">
            Just a moment—the tool is getting everything ready.
          </p>
        )}
      </div>
    </ToolPage>
  );
}
