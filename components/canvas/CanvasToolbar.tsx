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
}: CanvasToolbarProps) {
  const btn = flat
    ? "px-2 py-1 text-[10px] border border-[#444] hover:bg-[#333] disabled:opacity-30"
    : "rounded-md px-2 py-1.5 text-xs hover:bg-zinc-700 disabled:opacity-30";

  const toolBtn = (active: boolean) =>
    flat
      ? `flex h-7 min-w-[28px] items-center justify-center border px-1 text-[10px] ${
          active
            ? "border-[#60a5fa] bg-[#2563eb] text-white"
            : "border-[#444] text-zinc-300 hover:bg-[#333]"
        }`
      : `flex h-9 min-w-[36px] items-center justify-center rounded-md px-2 text-sm ${
          active ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
        }`;

  return (
    <div className={`shrink-0 border-b bg-[#1a1a1a] ${flat ? "border-[#333]" : "border-zinc-700/50"}`}>
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        <div className={`flex flex-wrap ${flat ? "gap-0" : "gap-0.5 rounded-lg bg-zinc-800 p-1"}`}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => onToolChange(t.id)}
              className={toolBtn(tool === t.id)}
            >
              <span className="leading-none">{t.icon}</span>
              <span className="ml-0.5 hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className={`mx-1 h-5 w-px ${flat ? "bg-[#444]" : "bg-zinc-700"}`} />

        <div className="flex items-center gap-0.5">
          {ANNOTATION_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => onColorChange(c.value)}
              className={`h-5 w-5 border ${color === c.value ? "border-white" : "border-transparent"}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className={`mx-1 h-5 w-px ${flat ? "bg-[#444]" : "bg-zinc-700"}`} />

        <div className="flex gap-0.5">
          <button type="button" disabled={!canUndo} onClick={onUndo} className={`${btn} text-zinc-300`}>
            撤销
          </button>
          <button type="button" disabled={!canRedo} onClick={onRedo} className={`${btn} text-zinc-300`}>
            重做
          </button>
          <button type="button" disabled={!canDelete} onClick={onDelete} className={`${btn} text-red-400`}>
            删除
          </button>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))} className={`${btn} text-zinc-300`}>
            −
          </button>
          <span className="min-w-[2.5rem] text-center text-[10px] text-zinc-400">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" onClick={() => onZoomChange(Math.min(2, zoom + 0.1))} className={`${btn} text-zinc-300`}>
            +
          </button>
        </div>
      </div>
      {hint && (
        <p className={`border-t px-2 py-0.5 text-[9px] text-zinc-500 ${flat ? "border-[#333]" : "border-zinc-800"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export { DEFAULT_ANNOTATION_COLOR };
