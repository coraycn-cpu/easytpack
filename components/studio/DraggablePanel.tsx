"use client";

import { useRef, useState } from "react";

export type PanelVariant = "artboard" | "ai" | "data";

const VARIANT_STYLES: Record<
  PanelVariant,
  { border: string; header: string; accent: string }
> = {
  artboard: {
    border: "border-[#333]",
    header: "bg-[#1a1a1a] text-white",
    accent: "border-l-4 border-l-[#333]",
  },
  ai: {
    border: "border-[#2563eb]",
    header: "bg-[#2563eb] text-white",
    accent: "border-l-4 border-l-[#2563eb]",
  },
  data: {
    border: "border-[#64748b]",
    header: "bg-[#475569] text-white",
    accent: "border-l-4 border-l-[#64748b]",
  },
};

type DraggablePanelProps = {
  id: string;
  title: string;
  variant: PanelVariant;
  x: number;
  y: number;
  width: number;
  height?: number;
  onMove: (x: number, y: number) => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  scale?: number;
};

export default function DraggablePanel({
  id,
  title,
  variant,
  x,
  y,
  width,
  height,
  onMove,
  children,
  headerExtra,
  scale = 1,
}: DraggablePanelProps) {
  const styles = VARIANT_STYLES[variant];
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y };
    setDragging(true);
  };

  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const dx = (e.clientX - dragRef.current.sx) / scale;
    const dy = (e.clientY - dragRef.current.sy) / scale;
    onMove(dragRef.current.ox + dx, dragRef.current.oy + dy);
  };

  const onHeaderPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      data-panel={id}
      className={`absolute flex flex-col border bg-white shadow-[2px_2px_0_#00000018] ${styles.border} ${styles.accent} ${dragging ? "z-50" : "z-10"}`}
      style={{ left: x, top: y, width, height: height ?? "auto", maxHeight: height }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`flex shrink-0 cursor-move items-center justify-between border-b px-3 py-1.5 text-xs font-medium ${styles.header} ${styles.border}`}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
      >
        <span>{title}</span>
        {headerExtra}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
