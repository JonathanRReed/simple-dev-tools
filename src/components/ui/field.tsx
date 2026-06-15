"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label text. */
  label: React.ReactNode;
  /** id of the control this label points at (sets htmlFor). */
  htmlFor?: string;
  /** Optional helper text shown under the control. */
  hint?: React.ReactNode;
  /** Optional error text (overrides hint, styled destructive). */
  error?: React.ReactNode;
  /** Trailing content rendered on the label row (e.g. a count or action). */
  action?: React.ReactNode;
}

/**
 * A labeled control wrapper. Standardizes the 18+ ad-hoc `<label> + control`
 * pairs across the tools so every field has a real, square, monospace label
 * and consistent hint/error slots.
 */
const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ label, htmlFor, hint, error, action, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {action ? <div className="flex items-center gap-1">{action}</div> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
);
Field.displayName = "Field";

export { Field };
