"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioLayout } from "@/lib/studio/layout";

type InfiniteCanvasProps = {
  viewport: StudioLayout["viewport"];
  onViewportChange: (viewport: StudioLayout["viewport"]) => void;
  /** 画布正上方居中显示，不随缩放/平移变化 */
  titleLabel?: string;
  children: React.ReactNode;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;

export default function InfiniteCanvas({
  viewport,
  onViewportChange,
  titleLabel,
  children,
}: InfiniteCanvasProps) {
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
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

  /** 捕获阶段 + non-passive：确保滚过 Konva canvas 时也能缩放 */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("textarea, input, [data-no-canvas-zoom]")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const current = viewportRef.current;
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, current.scale * zoomFactor),
      );
      if (Math.abs(nextScale - current.scale) < 0.0001) return;

      // 以光标为锚点缩放，避免画面「跳」到角落
      const worldX = (cursorX - current.panX) / current.scale;
      const worldY = (cursorY - current.panY) / current.scale;
      const nextPanX = cursorX - worldX * nextScale;
      const nextPanY = cursorY - worldY * nextScale;

      onViewportChangeRef.current({
        panX: nextPanX,
        panY: nextPanY,
        scale: nextScale,
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const startPan = (clientX: number, clientY: number) => {
    setIsPanning(true);
    const current = viewportRef.current;
    panStart.current = {
      x: clientX,
      y: clientY,
      panX: current.panX,
      panY: current.panY,
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
    onViewportChangeRef.current({
      ...viewportRef.current,
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {titleLabel?.trim() ? (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[min(480px,calc(100%-2rem))] -translate-x-1/2 truncate rounded-md bg-white/90 px-3 py-1 text-sm font-semibold tracking-wide text-slate-700 shadow-sm backdrop-blur-sm"
          title={titleLabel.trim()}
        >
          {titleLabel.trim()}
        </div>
      ) : null}

      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
