"use client";

import * as React from "react";
import { Check, Copy, X } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "error";

export interface CopyButtonProps extends Omit<ButtonProps, "value" | "children"> {
  /** Text to copy. Can be a string or a lazy getter (evaluated on click). */
  value: string | (() => string);
  /** Visible label. Omit for an icon-only button. */
  label?: string;
}

/**
 * The single copy affordance used across every tool. Shows a transient
 * confirmation, announces it via aria-live, and surfaces clipboard failures —
 * replacing the six ad-hoc implementations that existed before.
 */
const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({ value, label, className, variant = "outline", size, disabled, ...props }, ref) => {
    const [state, setState] = React.useState<CopyState>("idle");
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
      if (timer.current) clearTimeout(timer.current);
    }, []);

    const onCopy = React.useCallback(async () => {
      const text = typeof value === "function" ? value() : value;
      try {
        await navigator.clipboard.writeText(text ?? "");
        setState("copied");
      } catch {
        setState("error");
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 1400);
    }, [value]);

    const Icon = state === "copied" ? Check : state === "error" ? X : Copy;
    const text =
      state === "copied" ? "Copied" : state === "error" ? "Failed" : label ?? "Copy";

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size ?? (label ? "sm" : "icon")}
        onClick={onCopy}
        disabled={disabled}
        aria-label={label ? undefined : "Copy to clipboard"}
        className={cn(
          state === "copied" && "border-rp-foam text-rp-foam",
          state === "error" && "border-destructive text-destructive",
          className
        )}
        {...props}
      >
        <Icon className="size-4" aria-hidden="true" />
        {label ? <span>{text}</span> : null}
        <span className="sr-only" role="status" aria-live="polite">
          {state === "copied" ? "Copied to clipboard" : state === "error" ? "Copy failed" : ""}
        </span>
      </Button>
    );
  }
);
CopyButton.displayName = "CopyButton";

export { CopyButton };
