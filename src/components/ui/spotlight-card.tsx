"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Retired: the cursor-following spotlight conflicted with the brutalist
 * direction. Kept as a thin, square, hard-bordered surface so any remaining
 * imports stay valid. Prefer Card or .brutal-box for new work.
 */
const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-none border-2 border-border bg-card transition-colors hover:border-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

SpotlightCard.displayName = "SpotlightCard";

export { SpotlightCard };
