import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageSectionProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A prose section on the long-form pages (About, Contact, Privacy): a 2px
 * rule, a display-face h2, and a muted body with a 7-line rhythm.
 */
export default function PageSection({ title, children, className }: PageSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3 border-t-2 border-border pt-6", className)}>
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-pretty leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline">
        {children}
      </div>
    </section>
  );
}
