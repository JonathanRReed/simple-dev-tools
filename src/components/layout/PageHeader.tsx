import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  /**
   * A short marker above the title. Only for pages where it carries real
   * information the title does not (an HTTP status, for instance).
   */
  eyebrow?: ReactNode;
  /** Rendered to the left of the title (a tool's icon tile). */
  leading?: ReactNode;
  /** The page's single <h1>. */
  title: ReactNode;
  /** Lede paragraphs rendered under the title. */
  children?: ReactNode;
  className?: string;
};

/**
 * The one page header. Every route (tools, trust pages, error states) renders
 * its <h1> through this so the title, lede rhythm, display face and measure
 * stay identical across the site.
 */
export default function PageHeader({ eyebrow, leading, title, children, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {eyebrow != null ? (
        <p className="readout text-sm font-semibold text-muted-foreground">{eyebrow}</p>
      ) : null}
      <div className="flex items-center gap-3">
        {leading}
        <h1 className="font-display text-[1.75rem] text-balance text-foreground sm:text-4xl">{title}</h1>
      </div>
      {children != null ? (
        <div className="flex max-w-[68ch] flex-col gap-1.5 text-pretty text-[0.95rem] leading-relaxed text-muted-foreground [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-foreground">
          {children}
        </div>
      ) : null}
    </header>
  );
}
