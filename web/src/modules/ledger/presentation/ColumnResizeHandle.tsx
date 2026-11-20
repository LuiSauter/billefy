"use client";

import { cn } from "@/shared/lib/utils";

interface ColumnResizeHandleProps {
  onPointerDown: (event: React.PointerEvent) => void;
  isResizing: boolean;
}

/** A thin draggable strip on a TableHead's right edge, for manual column resize. */
export function ColumnResizeHandle({ onPointerDown, isResizing }: ColumnResizeHandleProps) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className={cn(
        "absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none select-none",
        "hover:bg-primary/40",
        isResizing && "bg-primary/60"
      )}
    />
  );
}
