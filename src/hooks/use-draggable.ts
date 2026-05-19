"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  /** Storage key to persist position across page navigations */
  storageKey: string;
  /** Default position from the right edge (px) */
  defaultRight?: number;
  /** Default position from the bottom edge (px) */
  defaultBottom?: number;
}

/**
 * Reusable hook for making a floating widget draggable via mouse and touch.
 *
 * Returns:
 *  - `position`    – current {x, y} in viewport coords (top-left of element)
 *  - `isDragging`  – true while the user is actively dragging
 *  - `dragHandleProps` – spread these onto the drag-handle element
 *  - `containerRef`    – attach this ref to the outermost positioned wrapper
 */
export function useDraggable({
  storageKey,
  defaultRight = 32,
  defaultBottom = 32,
}: UseDraggableOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Track the pointer offset relative to the element's top-left corner
  const offsetRef = useRef<Position>({ x: 0, y: 0 });

  // ── Initialise position from localStorage or defaults ──────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Position;
        // Clamp to current viewport
        const x = Math.min(Math.max(0, parsed.x), window.innerWidth - 60);
        const y = Math.min(Math.max(0, parsed.y), window.innerHeight - 40);
        setPosition({ x, y });
        return;
      }
    } catch {
      // ignore
    }
    // Compute default: bottom-right corner
    setPosition({
      x: window.innerWidth - defaultRight - 260,
      y: window.innerHeight - defaultBottom - 80,
    });
  }, [storageKey, defaultRight, defaultBottom]);

  // ── Persist position ───────────────────────────────────────────────────
  const persist = useCallback(
    (pos: Position) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos));
      } catch {
        // quota exceeded – fine, non-critical
      }
    },
    [storageKey],
  );

  // ── Clamp helper ───────────────────────────────────────────────────────
  const clamp = useCallback((pos: Position): Position => {
    const el = containerRef.current;
    const w = el?.offsetWidth ?? 260;
    const h = el?.offsetHeight ?? 80;
    return {
      x: Math.min(Math.max(0, pos.x), window.innerWidth - w),
      y: Math.min(Math.max(0, pos.y), window.innerHeight - h),
    };
  }, []);

  // ── Pointer handlers ───────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only respond to left mouse button or touch
      if (e.button !== 0) return;

      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      setIsDragging(true);
      // Capture pointer so we get events even outside the element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const newPos = clamp({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
      setPosition(newPos);
    },
    [isDragging, clamp],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Persist final position
      const finalPos = clamp({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
      setPosition(finalPos);
      persist(finalPos);
    },
    [isDragging, clamp, persist],
  );

  // ── Recalculate on resize ──────────────────────────────────────────────
  useEffect(() => {
    function onResize() {
      setPosition((prev) => (prev ? clamp(prev) : prev));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    style: { cursor: isDragging ? "grabbing" : "grab", touchAction: "none" } as React.CSSProperties,
  };

  return { position, isDragging, dragHandleProps, containerRef };
}
