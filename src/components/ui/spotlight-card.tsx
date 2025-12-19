"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

/**
 * SpotlightCard - A wrapper that adds subtle cursor-following spotlight effect
 * Utility-focused: lightweight, subtle, and accessible
 */
const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
    ({ className, children, ...props }, ref) => {
        const cardRef = React.useRef<HTMLDivElement>(null);

        const handleMouseMove = React.useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!cardRef.current) return;
                const rect = cardRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                cardRef.current.style.setProperty("--spotlight-x", `${x}%`);
                cardRef.current.style.setProperty("--spotlight-y", `${y}%`);
            },
            []
        );

        const handleMouseEnter = React.useCallback(() => {
            if (!cardRef.current) return;
            cardRef.current.style.setProperty("--spotlight-opacity", "1");
        }, []);

        const handleMouseLeave = React.useCallback(() => {
            if (!cardRef.current) return;
            cardRef.current.style.setProperty("--spotlight-opacity", "0");
        }, []);

        return (
            <div
                ref={(node) => {
                    (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    if (typeof ref === "function") {
                        ref(node);
                    } else if (ref) {
                        ref.current = node;
                    }
                }}
                className={cn("spotlight-card premium-card", className)}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                {children}
            </div>
        );
    }
);

SpotlightCard.displayName = "SpotlightCard";

export { SpotlightCard };
