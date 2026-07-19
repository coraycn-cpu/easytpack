"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioLayout } from "@/lib/studio/layout";

type InfiniteCanvasProps = {
  viewport: StudioLayout["viewport"];
  onViewportChange: (viewport: StudioLayout["viewport"]) => void;
  /** 画布区域正上方居中显示款式名（不挡操作） */
  titleLabel?: string;
  children: React.ReactNode;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
/** 拖到靠近可视区边缘时自动平移，避免被顶栏/侧栏裁切观感 */
const EDGE_AUTO_PAN_PX = 56;
const EDGE_AUTO_PAN_SPEED = 14;

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
  const isPanningRef = useRef(false);
  const spaceDownRef = useRef(false);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);

  useEffect(() => {
    spaceDownRef.current = spaceDown;
  }, [spaceDown]);

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

  /**
   * 在 Konva 画布上按住拖拽且靠近边缘时，自动平移视口。
   * 不改标注/选中/缩放逻辑；空格平移中不启用。
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    let running = false;
    let clientX = 0;
    let clientY = 0;

    const stop = () => {
      running = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const tick = () => {
      raf = 0;
      if (!running) return;
      if (isPanningRef.current || spaceDownRef.current) {
        stop();
        return;
      }

      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const edge = EDGE_AUTO_PAN_PX;
      let dX = 0;
      let dY = 0;

      if (x < edge) dX = EDGE_AUTO_PAN_SPEED * (1 - Math.max(0, x) / edge);
      else if (x > rect.width - edge) {
        dX =
          -EDGE_AUTO_PAN_SPEED *
          (1 - Math.max(0, rect.width - x) / edge);
      }
      if (y < edge) dY = EDGE_AUTO_PAN_SPEED * (1 - Math.max(0, y) / edge);
      else if (y > rect.height - edge) {
        dY =
          -EDGE_AUTO_PAN_SPEED *
          (1 - Math.max(0, rect.height - y) / edge);
      }

      if (dX !== 0 || dY !== 0) {
        const vp = viewportRef.current;
        onViewportChangeRef.current({
          panX: vp.panX + dX,
          panY: vp.panY + dY,
          scale: vp.scale,
        });
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const maybeStart = () => {
      if (running || isPanningRef.current || spaceDownRef.current) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const near =
        x < EDGE_AUTO_PAN_PX ||
        y < EDGE_AUTO_PAN_PX ||
        x > rect.width - EDGE_AUTO_PAN_PX ||
        y > rect.height - EDGE_AUTO_PAN_PX;
      if (!near) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      clientX = e.clientX;
      clientY = e.clientY;
      if (e.buttons !== 1) {
        stop();
        return;
      }
      const target = e.target as HTMLElement | null;
      // 仅在画布 Stage 上拖拽时启用，避免拖侧栏/面板时误平移
      if (!target?.closest?.("canvas")) {
        stop();
        return;
      }
      maybeStart();
    };

    const onPointerUp = () => stop();

    window.addEventListener("pointermove", onPointerMove, { capture: true });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", onPointerUp, { capture: true });
    return () => {
      stop();
      window.removeEventListener("pointermove", onPointerMove, {
        capture: true,
      });
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
      window.removeEventListener("pointercancel", onPointerUp, {
        capture: true,
      });
    };
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
          className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[min(420px,calc(100%-2rem))] -translate-x-1/2 truncate rounded-md bg-white/90 px-3 py-1 text-sm font-semibold tracking-wide text-slate-700 shadow-sm backdrop-blur-sm"
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
