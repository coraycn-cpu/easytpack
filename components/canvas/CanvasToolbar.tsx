"use client";

import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
} from "@/lib/canvas/constants";
import type { CanvasTool } from "@/types/canvas";

type CanvasToolbarProps = {
  tool: CanvasTool;
  onToolChange: (t: CanvasTool) => void;
  color: string;
  onColorChange: (c: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDelete: () => void;
  canDelete: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  hint?: string;
};

const TOOLS: { id: CanvasTool; label: string; icon: string }[] = [
  { id: "select", label: "选择", icon: "↖" },
  { id: "rect", label: "方框", icon: "□" },
  { id: "circle", label: "圆圈", icon: "○" },
  { id: "arrow", label: "箭头", icon: "→" },
  { id: "text", label: "文字", icon: "T" },
  { id: "dimension", label: "尺寸", icon: "↔" },
  { id: "freehand", label: "画笔", icon: "✎" },
  { id: "marker", label: "序号", icon: "①" },
  { id: "hotspot", label: "部位", icon: "⊞" },
];

export default function CanvasToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDelete,
  canDelete,
  zoom,
  onZoomChange,
  hint,
}: CanvasToolbarProps) {
  return (
    <div className="shrink-0 border-b border-zinc-700/50 bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <div className="flex flex-wrap gap-0.5 rounded-lg bg-zinc-800 p-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => onToolChange(t.id)}
            className={`flex h-9 min-w-[36px] items-center justify-center rounded-md px-2 text-sm transition ${
              tool === t.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span className="ml-1 hidden text-xs lg:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-zinc-700" />

      <div className="flex items-center gap-1">
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            onClick={() => onColorChange(c.value)}
            className={`h-6 w-6 rounded-full border-2 transition ${
              color === c.value ? "border-white scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <div className="h-6 w-px bg-zinc-700" />

      <div className="flex gap-1">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
        >
          撤销
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          className="rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
        >
          重做
        </button>
        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          className="rounded-md px-2 py-1.5 text-xs text-red-400 hover:bg-zinc-700 disabled:opacity-30"
        >
          删除
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
          className="rounded-md px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-xs text-zinc-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
          className="rounded-md px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onZoomChange(1)}
          className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
        >
          适应
        </button>
      </div>
      </div>
      {hint && (
        <p className="border-t border-zinc-800 px-3 py-1 text-[10px] text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

export { DEFAULT_ANNOTATION_COLOR };
