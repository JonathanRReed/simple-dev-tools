import type { ReactNode } from "react";

import { KeyboardShortcutsDialog, type ToolShortcut } from "@/components/KeyboardShortcuts";
import TrustBadge from "@/components/TrustBadge";
import { ShareButton } from "@/components/ui/share-button";
import { cn } from "@/lib/utils";

export interface ToolShellProps {
  children: ReactNode;
  /** Small monospace label shown at the left of the top bar. */
  eyebrow?: ReactNode;
  /** Actions rendered at the right of the top bar (Reset, Sample, toggles…). */
  toolbar?: ReactNode;
  /**
   * Returns the tool's shareable URL params, or null when there is nothing
   * worth sharing. When provided, a "Copy link" button joins the top bar.
   */
  shareParams?: () => Record<string, string> | null;
  /** Shortcut list shown in the help dialog (a "?" button joins the top bar). */
  shortcuts?: ToolShortcut[];
  /** Hide the local-first trust badge (rarely needed). */
  hideTrustBadge?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * The single brutalist surface every tool renders into: square, 2px border,
 * flat solid card background (no glass/blur/large-radius). The page's <h1>
 * lives in the server page.tsx; this shell only frames the interactive UI and
 * an optional top action bar. Replaces the per-tool
 * `rounded-3xl shadow-2xl backdrop-blur` wrappers.
 */
export default function ToolShell({
  children,
  eyebrow,
  toolbar,
  shareParams,
  shortcuts,
  hideTrustBadge,
  className,
  contentClassName,
}: ToolShellProps) {
  const hasExtras = shareParams != null || shortcuts != null || !hideTrustBadge;
  const hasBar = eyebrow != null || toolbar != null || hasExtras;
  return (
    <section className={cn("border-2 border-border bg-card", className)}>
      {hasBar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border px-4 py-2.5">
          {eyebrow != null ? <span className="brutal-label">{eyebrow}</span> : <span />}
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {shortcuts != null && shortcuts.length > 0 ? (
              <KeyboardShortcutsDialog shortcuts={shortcuts} />
            ) : null}
            {shareParams != null ? <ShareButton getParams={shareParams} /> : null}
            {!hideTrustBadge ? <TrustBadge /> : null}
          </div>
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
