import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Per-tool local-first assurance. Everything in this app runs in the browser;
 * this badge makes that guarantee visible where the work happens instead of
 * burying it in the privacy page.
 */
export default function TrustBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground",
        className
      )}
      title="This tool runs entirely in your browser. Your input never leaves your machine."
    >
      <ShieldCheck className="size-3.5 text-rp-pine" aria-hidden="true" />
      Runs locally — nothing leaves your browser
    </span>
  );
}
