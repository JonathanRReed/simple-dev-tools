import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageSectionProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A prose section on the long-form pages (About, Contact, Privacy): a
 * hairline, an expanded-face h2, and a muted body at a readable measure.
 */
export default function PageSection({ title, children, className }: PageSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3 border-t border-border pt-7", className)}>
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      <div className="flex max-w-[68ch] flex-col gap-3 text-pretty leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-primary [&_a]:decoration-2 [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        {children}
      </div>
    </section>
  );
}
