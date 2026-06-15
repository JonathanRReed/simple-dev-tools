"use client";

import * as React from "react";

import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

export interface ResultPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional monospace header label. */
  title?: React.ReactNode;
  /** When provided, a CopyButton is shown in the header. */
  copyValue?: string | (() => string);
  /** Extra header actions (rendered before the copy button). */
  actions?: React.ReactNode;
  /** Constrain body height + scroll. */
  scroll?: boolean;
  /** Render the body as a monospace <pre> block. */
  mono?: boolean;
  bodyClassName?: string;
}

/**
 * The shared output surface: square, 2px border, solid bg, no blur/shadow,
 * with an optional header (label + actions + copy). Replaces the per-tool
 * `rounded-3xl/backdrop-blur` output wrappers.
 */
const ResultPanel = React.forwardRef<HTMLDivElement, ResultPanelProps>(
  (
    { title, copyValue, actions, scroll, mono, className, bodyClassName, children, ...props },
    ref
  ) => {
    const hasHeader = title != null || copyValue != null || actions != null;
    const empty = copyValue == null
      ? false
      : (typeof copyValue === "string" ? copyValue.length === 0 : false);
    return (
      <div
        ref={ref}
        className={cn("border-2 border-border bg-card", className)}
        {...props}
      >
        {hasHeader ? (
          <div className="flex items-center justify-between gap-2 border-b-2 border-border px-3 py-2">
            <span className="brutal-label truncate">{title}</span>
            <div className="flex shrink-0 items-center gap-1">
              {actions}
              {copyValue != null ? (
                <CopyButton value={copyValue} disabled={empty} />
              ) : null}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "p-3",
            scroll && "max-h-[420px] overflow-auto",
            mono && "whitespace-pre-wrap break-words font-mono text-sm",
            bodyClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);
ResultPanel.displayName = "ResultPanel";

export { ResultPanel };
