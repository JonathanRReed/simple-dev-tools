import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToolNotesProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * The notes under a tool: limits, format details, privacy specifics. Set
 * straight on the bench under a hairline, not boxed, so the tool panel stays
 * the only raised thing on the page. Accepts paragraphs or lists.
 */
export default function ToolNotes({ title = "Notes", children, className }: ToolNotesProps) {
  return (
    <section
      className={cn(
        "border-t border-border px-1 pt-5 text-sm leading-relaxed text-muted-foreground",
        className
      )}
    >
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex max-w-[78ch] flex-col gap-2 text-pretty [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-foreground [&_ul]:list-outside [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-[var(--line-strong)]">
        {children}
      </div>
    </section>
  );
}
