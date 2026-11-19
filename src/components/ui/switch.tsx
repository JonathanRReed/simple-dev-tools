"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * A slide switch: a recessed track with a raised knob, and the track lights up
 * in the primary color when on. Rendered as a real `role="switch"` button so
 * it is reachable and operable from the keyboard.
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-input shadow-well transition-colors",
        checked ? "bg-primary" : "bg-background",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0.5 size-3.5 rounded-full shadow-[0_1px_2px_var(--shade-soft)] transition-transform duration-150",
          checked ? "translate-x-4 bg-primary-foreground" : "translate-x-0 bg-muted-foreground"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
