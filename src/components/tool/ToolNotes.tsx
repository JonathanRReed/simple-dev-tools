import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToolNotesProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * The "notes" surface under a tool: limits, format details, privacy specifics.
 * Square card, monospace label, muted body. Accepts paragraphs or lists.
 */
export default function ToolNotes({ title = "Notes", children, className }: ToolNotesProps) {
  return (
    <section
      className={cn(
        "border-2 border-border bg-card p-5 text-sm leading-7 text-muted-foreground",
        className
      )}
    >
      <h2 className="brutal-label mb-3 text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-pretty [&_code]:font-mono [&_code]:text-foreground [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
