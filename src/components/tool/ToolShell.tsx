import type { ReactNode } from "react";

import { KeyboardShortcutsDialog, type ToolShortcut } from "@/components/KeyboardShortcuts";
import TrustBadge from "@/components/TrustBadge";
import { ShareButton } from "@/components/ui/share-button";
import { cn } from "@/lib/utils";

export interface ToolShellProps {
  children: ReactNode;
  /**
   * Names this panel when a page has more than one (the Security studio's
   * tabs, for example). Leave it off when the page title already says it.
   */
  label?: ReactNode;
  /** Actions rendered at the right of the top bar (Reset, Sample, toggles…). */
  toolbar?: ReactNode;
  /**
   * Returns the tool's shareable URL params, or null when there is nothing
   * worth sharing. When provided, a "Copy link" button joins the top bar.
   */
  shareParams?: () => Record<string, string> | null;
  /** Shortcut list shown in the help dialog (a keyboard button joins the top bar). */
  shortcuts?: ToolShortcut[];
  /** Hide the local-first indicator (rarely needed). */
  hideTrustBadge?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * The instrument body every tool renders into: one raised panel with a
 * faceplate strip across the top. The strip carries the "runs locally" light
 * on the left and the tool's controls on the right. The page's <h1> lives in
 * the server page.tsx; this shell only frames the interactive surface.
 */
export default function ToolShell({
  children,
  label,
  toolbar,
  shareParams,
  shortcuts,
  hideTrustBadge,
  className,
  contentClassName,
}: ToolShellProps) {
  const hasActions =
    toolbar != null || shareParams != null || (shortcuts != null && shortcuts.length > 0);
  const hasBar = label != null || hasActions || !hideTrustBadge;
  return (
    <section className={cn("panel", className)}>
      {hasBar ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {!hideTrustBadge ? <TrustBadge /> : null}
            {label != null ? (
              <span className="truncate text-sm font-semibold text-foreground">{label}</span>
            ) : null}
          </div>
          {hasActions ? (
            <div className="flex flex-wrap items-center gap-2 pb-0.5">
              {toolbar}
              {shortcuts != null && shortcuts.length > 0 ? (
                <KeyboardShortcutsDialog shortcuts={shortcuts} />
              ) : null}
              {shareParams != null ? <ShareButton getParams={shareParams} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  );
}
