"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type Pos = { x: number; y: number };

type DraggableFloatPanelProps = {
  children: ReactNode;
  /** sessionStorage key；不传则不记住位置 */
  storageKey?: string;
  /** 默认贴右上：right / top（像素） */
  defaultRight?: number;
  defaultTop?: number;
  widthClassName?: string;
  className?: string;
  zIndexClassName?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function readStored(key: string | undefined): Pos | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * 可拖动浮层：挡住画布时可拖开。仅拖动手柄可移动，面板内点击/滚动不受影响。
 */
export default function DraggableFloatPanel({
  children,
  storageKey,
  defaultRight = 16,
  defaultTop = 56,
  widthClassName = "w-[min(100vw-1.5rem,340px)]",
  className = "",
  zIndexClassName = "z-30",
}: DraggableFloatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);

  // 初始位置：优先记住的位置，否则右上角
  useEffect(() => {
    const stored = readStored(storageKey);
    if (stored) {
      setPos(stored);
      return;
    }
    const w = panelRef.current?.offsetWidth ?? 340;
    const x = Math.max(8, window.innerWidth - w - defaultRight);
    setPos({ x, y: defaultTop });
  }, [storageKey, defaultRight, defaultTop]);

  const persist = useCallback(
    (next: Pos) => {
      if (!storageKey) return;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const clampToViewport = useCallback((next: Pos): Pos => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 340;
    const h = el?.offsetHeight ?? 200;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - Math.min(h, window.innerHeight - 16) - 8);
    return {
      x: clamp(next.x, 8, maxX),
      y: clamp(next.y, 8, maxY),
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPos((prev) => (prev ? clampToViewport(prev) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pos) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const next = clampToViewport({
      x: drag.origX + (e.clientX - drag.startX),
      y: drag.origY + (e.clientY - drag.startY),
    });
    setPos(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setPos((prev) => {
      if (!prev) return prev;
      const next = clampToViewport(prev);
      persist(next);
      return next;
    });
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={panelRef}
      className={`pointer-events-auto fixed ${widthClassName} ${zIndexClassName} ${className}`}
      style={{
        left: pos?.x ?? undefined,
        top: pos?.y ?? undefined,
        right: pos ? "auto" : defaultRight,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div
        className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ${
          dragging ? "ring-2 ring-blue-300" : ""
        }`}
      >
        <div
          role="separator"
          aria-label="拖动信息面板"
          title="按住拖动面板"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`flex cursor-grab items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-2.5 py-1.5 select-none active:cursor-grabbing ${
            dragging ? "bg-blue-50" : ""
          }`}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <span aria-hidden className="tracking-tighter text-slate-400">
              ⋮⋮
            </span>
            拖动移动
          </span>
          <span className="text-[9px] text-slate-400">挡住画面时可拖开</span>
        </div>
        {children}
      </div>
    </div>
  );
}
