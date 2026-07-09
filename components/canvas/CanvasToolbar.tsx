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
  flat?: boolean;
  theme?: "light" | "dark";
  /** AI 智能标注（与标注工具同一栏） */
  onSmartAnnotate?: () => void;
  smartAnnotateLoading?: boolean;
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
  flat,
  theme = "dark",
  onSmartAnnotate,
  smartAnnotateLoading,
}: CanvasToolbarProps) {
  const light = theme === "light";

  const actionBtn = (disabled: boolean, danger?: boolean) =>
    light
      ? `inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          danger
            ? "text-rose-600 hover:bg-rose-50"
            : "text-slate-600 hover:bg-slate-100"
        }`
      : `inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          danger ? "text-red-400 hover:bg-zinc-800" : "text-zinc-300 hover:bg-zinc-800"
        }`;

  const toolBtn = (active: boolean) =>
    light
      ? `inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition ${
          active
            ? "bg-white text-blue-600 shadow-sm ring-1 ring-blue-200"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
        }`
      : `inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-sm transition ${
          active ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
        }`;

  const zoomBtn = light
    ? "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-600 transition hover:bg-slate-100"
    : "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm text-zinc-300 hover:bg-zinc-800";

  return (
    <div
      className={`shrink-0 ${
        light ? "border-b border-slate-200/80 bg-white" : flat ? "border-b border-[#333] bg-[#1a1a1a]" : "border-b border-zinc-700/50 bg-[#1a1a1a]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <div
          className={`inline-flex flex-wrap items-center gap-0.5 rounded-lg p-1 ${
            light ? "bg-slate-100" : flat ? "bg-[#262626]" : "rounded-lg bg-zinc-800 p-1"
          }`}
        >
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => onToolChange(t.id)}
              className={toolBtn(tool === t.id)}
            >
              <span className="text-sm leading-none">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {onSmartAnnotate && (
          <>
            <div className={`h-6 w-px ${light ? "bg-slate-200" : "bg-zinc-700"}`} />
            <button
              type="button"
              disabled={smartAnnotateLoading}
              onClick={onSmartAnnotate}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                light
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              <span>✦</span>
              {smartAnnotateLoading ? "标注中…" : "AI智能标注"}
            </button>
          </>
        )}

        <div className={`h-6 w-px ${light ? "bg-slate-200" : "bg-zinc-700"}`} />

        <div className="flex items-center gap-1.5">
          {ANNOTATION_COLORS.slice(0, 5).map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => onColorChange(c.value)}
              className={`h-6 w-6 rounded-full transition ring-offset-2 ${
                light ? "ring-offset-white" : "ring-offset-[#1a1a1a]"
              } ${
                color === c.value
                  ? "ring-2 ring-slate-400 scale-110"
                  : "ring-1 ring-black/10 hover:scale-105"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className={`h-6 w-px ${light ? "bg-slate-200" : "bg-zinc-700"}`} />

        <div className="flex items-center gap-0.5">
          <button type="button" disabled={!canUndo} onClick={onUndo} className={actionBtn(!canUndo)}>
            撤销
          </button>
          <button type="button" disabled={!canRedo} onClick={onRedo} className={actionBtn(!canRedo)}>
            重做
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={onDelete}
            className={actionBtn(!canDelete, true)}
          >
            删除
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
            className={zoomBtn}
          >
            −
          </button>
          <span
            className={`min-w-[3rem] text-center text-xs font-medium tabular-nums ${
              light ? "text-slate-600" : "text-zinc-400"
            }`}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
            className={zoomBtn}
          >
            +
          </button>
        </div>
      </div>
      {hint && (
        <p
          className={`border-t px-4 py-1.5 text-[11px] ${
            light ? "border-slate-100 text-slate-400" : flat ? "border-[#333] text-zinc-500" : "border-zinc-800 text-zinc-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export { DEFAULT_ANNOTATION_COLOR };
