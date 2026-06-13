import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Row } from "@tanstack/react-table";

// Row-virtualizes a react-table's rows inside a scroll container so long tables
// keep only the visible window in the DOM. Returns the scroll ref to put on the
// scroller, the visible virtual items, and top/bottom spacer heights to render
// as empty <tr> padding rows (keeps the <table> valid). Heights are measured per
// row, so variable-height rows work without a fixed estimate.
export function useTableVirtualizer<T>(rows: Row<T>[], estimateSize = 49) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });
  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length ? items[0]!.start : 0;
  const paddingBottom = items.length
    ? virtualizer.getTotalSize() - items[items.length - 1]!.end
    : 0;
  return { scrollRef, virtualizer, items, paddingTop, paddingBottom };
}
