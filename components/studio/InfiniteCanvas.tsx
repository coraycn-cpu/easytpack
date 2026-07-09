"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudioLayout } from "@/lib/studio/layout";

type InfiniteCanvasProps = {
  viewport: StudioLayout["viewport"];
  onViewportChange: (viewport: StudioLayout["viewport"]) => void;
  children: React.ReactNode;
};

export default function InfiniteCanvas({
  viewport,
  onViewportChange,
  children,
}: InfiniteCanvasProps) {
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = Math.min(2, Math.max(0.25, viewport.scale * delta));
      onViewportChange({ ...viewport, scale: nextScale });
    },
    [viewport, onViewportChange],
  );

  const startPan = (clientX: number, clientY: number) => {
    setIsPanning(true);
    panStart.current = {
      x: clientX,
      y: clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-panel]") || target.tagName === "CANVAS") return;

    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startPan(e.clientX, e.clientY);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    onViewportChange({
      ...viewport,
      panX: panStart.current.panX + (e.clientX - panStart.current.x),
      panY: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  };

  const onPointerUp = () => setIsPanning(false);

  const gridSize = 24 * viewport.scale;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#ececec] select-none"
      style={{
        cursor: isPanning || spaceDown ? "grabbing" : "default",
        backgroundImage: "radial-gradient(circle, #b0b0b0 1px, transparent 1px)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
      }}
      onWheel={handleWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.scale})`,
        }}
      >
        {children}
      </div>

      <p className="pointer-events-none absolute bottom-3 right-3 text-[10px] text-[#888]">
        空白处拖动平移 · 滚轮缩放 · 空格可临时抓手
      </p>
    </div>
  );
}
