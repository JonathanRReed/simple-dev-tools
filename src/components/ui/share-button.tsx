"use client";

import * as React from "react";
import { Link2, ShieldAlert } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { buildShareUrl, ShareUrlTooLargeError, type ShareParams } from "@/lib/share";
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

type ShareState = "idle" | "copied" | "error" | "too-large";

/**
 * "Copy link" affordance for tools with shareable state. Encodes the tool's
 * params into the URL hash (compressed when large) and copies the full URL.
 * Surfaces a distinct state when the state is too large for a URL.
 */
const ShareButton = React.forwardRef<HTMLButtonElement, ShareButtonProps>(
  ({ getParams, label = "Copy link", className, variant = "outline", size = "sm", ...props }, ref) => {
    const [state, setState] = React.useState<ShareState>("idle");
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
      if (timer.current) clearTimeout(timer.current);
    }, []);

    const onShare = React.useCallback(async () => {
      const params = getParams();
      if (!params) return;
      let url: string;
      try {
        url = buildShareUrl(params);
      } catch (e) {
        setState(e instanceof ShareUrlTooLargeError ? "too-large" : "error");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), 2600);
        return;
      }
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
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 1400);
    }, [getParams]);

    const badge =
      state === "copied"
        ? "border-rp-foam text-foreground"
        : state === "error" || state === "too-large"
          ? "border-destructive text-foreground"
          : "";

    const text =
      state === "copied"
        ? "Link copied"
        : state === "error"
          ? "Copy failed"
          : state === "too-large"
            ? "Too large for a link"
            : label;

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        onClick={onShare}
        aria-live="polite"
        className={cn(badge, className)}
        {...props}
      >
        {state === "too-large" ? (
          <ShieldAlert className="size-4" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        <span>{text}</span>
        <span className="sr-only" role="status" aria-live="polite">
          {state === "copied"
            ? "Share link copied to clipboard"
            : state === "too-large"
              ? "This content is too large for a share link. Download it as a file instead."
              : state === "error"
                ? "Copying the share link failed."
                : ""}
        </span>
      </Button>
    );
  }
);
ShareButton.displayName = "ShareButton";

export { ShareButton };
