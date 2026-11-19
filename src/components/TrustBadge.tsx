import { cn } from "@/lib/utils";

/**
 * Per-tool local-first assurance, shown as the instrument's power light.
 * Everything in this app runs in the browser; the indicator makes that visible
 * where the work happens instead of burying it in the privacy page.
 */
export default function TrustBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xs font-medium text-muted-foreground", className)}
      title="This tool runs entirely in your browser. Your input is never uploaded."
    >
      <span className="led" aria-hidden="true" />
      Runs locally
    </span>
  );
}
