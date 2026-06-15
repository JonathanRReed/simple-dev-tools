"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex items-start gap-2 border-2 px-3 py-2 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        error: "border-destructive bg-destructive/10 text-destructive",
        success: "border-rp-foam bg-rp-foam/10 text-rp-foam",
        warning: "border-rp-gold bg-rp-gold/10 text-rp-gold",
        info: "border-border bg-card text-muted-foreground",
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
