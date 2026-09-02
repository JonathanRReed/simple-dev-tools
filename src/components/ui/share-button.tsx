"use client";

import * as React from "react";
import { Link2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { buildShareUrl, type ShareParams } from "@/lib/share";
import { cn } from "@/lib/utils";

export interface ShareButtonProps extends Omit<ButtonProps, "children" | "value"> {
  /**
   * Returns the shareable state for the tool, or null when there is nothing
   * worth sharing (empty input). Evaluated on click so it always reflects
   * the latest state without re-render churn.
   */
  getParams: () => ShareParams | null;
  label?: string;
}

/**
 * "Copy link" affordance for tools with shareable state. Encodes the tool's
 * params into the URL hash (compressed when large) and copies the full URL.
 */
const ShareButton = React.forwardRef<HTMLButtonElement, ShareButtonProps>(
  ({ getParams, label = "Copy link", className, variant = "outline", size = "sm", ...props }, ref) => {
    const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
      if (timer.current) clearTimeout(timer.current);
    }, []);

    const onShare = React.useCallback(async () => {
      const params = getParams();
      if (!params) return;
      try {
        const url = await buildShareUrl(params);
        let copied = false;
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            copied = true;
          }
        } catch {
          copied = false;
        }
        if (!copied) {
          const textarea = document.createElement("textarea");
          textarea.value = url;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.top = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          copied = document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setState(copied ? "copied" : "error");
      } catch {
        setState("error");
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 1400);
    }, [getParams]);

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        onClick={onShare}
        className={cn(
          state === "copied" && "border-rp-foam text-rp-foam",
          state === "error" && "border-destructive text-destructive",
          className
        )}
        {...props}
      >
        <Link2 className="size-4" aria-hidden="true" />
        <span>{state === "copied" ? "Link copied" : state === "error" ? "Copy failed" : label}</span>
        <span className="sr-only" role="status" aria-live="polite">
          {state === "copied" ? "Share link copied to clipboard" : ""}
        </span>
      </Button>
    );
  }
);
ShareButton.displayName = "ShareButton";

export { ShareButton };
