"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";

export interface VirtualListProps<T> {
  items: T[];
  /** Rendered for each visible row. */
  children: (item: T, index: number) => ReactNode;
  /** Starting guess for a row's height; real heights are measured after mount. */
  estimateSize?: number;
  /** Height of the scroll viewport. */
  height?: number;
  /** Rows rendered beyond the viewport on each side. */
  overscan?: number;
  className?: string;
  /** Accessible name for the scroll region. */
  ariaLabel?: string;
}

/**
 * Windowed list for the long, variable-height outputs.
 *
 * The diff and SQL result views previously mounted one element per row with no
 * ceiling: a 10,000-line diff built roughly 40,000 nodes, each its own bordered
 * grid box, and a large query result built a cell per value — all in a single
 * synchronous commit that froze the tab. Only the rows near the viewport are
 * mounted now.
 *
 * Heights are measured rather than assumed, because these rows wrap: a long
 * line can be many visual rows tall, and a fixed row height would misplace
 * everything below it.
 */
export default function VirtualList<T>({
  items,
  children,
  estimateSize = 28,
  height = 420,
  overscan = 12,
  className,
  ariaLabel,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      // The region scrolls independently, so it needs to be reachable and
      // announced on its own.
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {children(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
