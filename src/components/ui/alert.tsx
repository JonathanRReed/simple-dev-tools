"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        // Semantic color lives in the border, tint and icon; text stays
        // foreground so light themes keep WCAG AA contrast on tinted surfaces.
        error: "border-destructive/70 bg-destructive/10 text-foreground [&>svg]:text-destructive",
        success: "border-rp-foam/55 bg-rp-foam/10 text-foreground [&>svg]:text-hue-web",
        warning: "border-rp-gold/60 bg-rp-gold/10 text-foreground [&>svg]:text-hue-data",
        info: "border-border bg-secondary/35 text-foreground [&>svg]:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

const ICONS: Record<string, LucideIcon> = {
  error: AlertTriangle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: boolean;
}

/**
 * Inline status surface used for every tool error/success message, replacing
 * the ad-hoc colored divs (incl. the non-theme `text-red-400`). Errors get
 * role="alert"; other variants announce politely.
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", icon = true, children, ...props }, ref) => {
    const Icon = ICONS[variant ?? "info"];
    return (
      <div
        ref={ref}
        role={variant === "error" ? "alert" : "status"}
        aria-live={variant === "error" ? "assertive" : "polite"}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {icon ? <Icon aria-hidden="true" /> : null}
        <div className="min-w-0 break-words">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export { Alert, alertVariants };
