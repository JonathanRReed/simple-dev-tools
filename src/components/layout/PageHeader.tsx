import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  /** Small monospace marker above the title (section, index, tags…). */
  eyebrow?: ReactNode;
  /** The page's single <h1>. */
  title: ReactNode;
  /** Lede paragraphs rendered under the title. */
  children?: ReactNode;
  className?: string;
};

/**
 * The one page header. Every route (tools, studios, trust pages, error
 * states) renders its <h1> through this so the eyebrow / title / lede rhythm,
 * display face, and measure stay identical across the site.
 */
export default function PageHeader({ eyebrow, title, children, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {eyebrow != null ? <p className="brutal-label">{eyebrow}</p> : null}
      <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
        {title}
      </h1>
      {children != null ? (
        <div className="flex max-w-3xl flex-col gap-2 text-pretty leading-7 text-muted-foreground [&_code]:font-mono [&_code]:text-foreground">
          {children}
        </div>
      ) : null}
    </header>
  );
}
