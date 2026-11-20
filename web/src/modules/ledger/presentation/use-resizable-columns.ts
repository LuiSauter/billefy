"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorageState } from "@/shared/hooks/use-local-storage-state";

export type ColumnWidths = Record<string, number>;

const MIN_COLUMN_WIDTH = 60;

/** Pure resize math: clamps the dragged width to the minimum, never below it. */
export function computeResizedWidth(startWidth: number, deltaX: number): number {
  return Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + deltaX));
}

interface DragState {
  columnId: string;
  startX: number;
  startWidth: number;
}

/**
 * Per-column pixel widths for a resizable table, persisted to localStorage under `storageKey`.
 * Returns the current widths, a ref-attaching resize-handle starter for a given column id,
 * and whether a drag is in progress (so callers can disable text selection while dragging).
 */
export function useResizableColumns(storageKey: string, defaults: ColumnWidths) {
  const [widths, setWidths] = useLocalStorageState<ColumnWidths>(storageKey, defaults);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!drag) return;
    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = computeResizedWidth(drag.startWidth, event.clientX - drag.startX);
      setWidths((prev) => ({ ...prev, [drag.columnId]: nextWidth }));
    };
    const handlePointerUp = () => setDrag(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, setWidths]);

  const startResize = useCallback(
    (columnId: string) => (event: React.PointerEvent) => {
      event.preventDefault();
      setDrag({
        columnId,
        startX: event.clientX,
        startWidth: widths[columnId] ?? defaults[columnId] ?? MIN_COLUMN_WIDTH,
      });
    },
    [widths, defaults]
  );

  const getWidth = useCallback((columnId: string) => widths[columnId] ?? defaults[columnId], [widths, defaults]);

  return { getWidth, startResize, resizingColumn: drag?.columnId ?? null };
}
