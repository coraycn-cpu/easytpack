"use client";

import { useRef } from "react";
import {
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_COLOR,
} from "@/lib/canvas/constants";
import type { LayerVisibility } from "@/lib/canvas/annotation-layers";
import { AI_ACTION_BUTTON_TITLES } from "@/lib/ai/image-source-hints";
import { ANN_ACTION_LABELS } from "@/lib/studio/annotation-ux";
import { readImageDataUrlFromFile } from "@/lib/canvas/paste-image";
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
  viewportScale?: number;
  onViewportScaleChange?: (scale: number) => void;
  onResetViewport?: () => void;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  flat?: boolean;
  theme?: "light" | "dark";
  /** Collect 全功能标注 */
  onFullCollect?: () => void;
  /** 工艺 tab：画布 batch 标注 + 工艺行 */
  onAnnotateProcess?: () => void;
  annotateProcessLoading?: boolean;
  /** 物料 tab */
  onFillBom?: () => void;
  /** 尺寸 tab */
  onFillSize?: () => void;
  /** 三 tab 补空白 */
  onEnhanceAll?: () => void;
  onExplain?: () => void;
  aiLoading?: boolean;
  /** 锁定手动工具，防止 AI 处理中误操作 */
  interactionLocked?: boolean;
  layerVisibility?: LayerVisibility;
  onLayerVisibilityChange?: (layers: LayerVisibility) => void;
  onPasteImage?: (dataUrl: string) => void;
  pasteImageDisabled?: boolean;
};

const TOOLS: { id: CanvasTool; label: string; icon: string }[] = [
  { id: "select", label: "选择", icon: "↖" },
  { id: "pan", label: "移动", icon: "✋" },
  { id: "rect", label: "方框", icon: "□" },
  { id: "circle", label: "圆圈", icon: "○" },
  { id: "arrow", label: "箭头", icon: "→" },
  { id: "line", label: "直线", icon: "／" },
  { id: "dash", label: "虚线", icon: "┅" },
  { id: "text", label: "文字", icon: "T" },
  { id: "dimension", label: "尺寸", icon: "↔" },
  { id: "freehand", label: "画笔", icon: "✎" },
  { id: "eraser", label: "橡皮", icon: "⌫" },
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
  viewportScale,
  onViewportScaleChange,
  onResetViewport,
  zoom = 1,
  onZoomChange,
  flat,
  theme = "dark",
  onFullCollect,
  onAnnotateProcess,
  annotateProcessLoading,
  onFillBom,
  onFillSize,
  onEnhanceAll,
  onExplain,
  aiLoading,
  interactionLocked,
  layerVisibility,
  onLayerVisibilityChange,
  onPasteImage,
  pasteImageDisabled,
}: CanvasToolbarProps) {
  const pasteFileRef = useRef<HTMLInputElement>(null);
  const light = theme === "light";
  const scale = viewportScale ?? zoom;
  const setScale = (next: number) => {
    const clamped = Math.min(2, Math.max(0.25, Math.round(next * 100) / 100));
    if (onViewportScaleChange) onViewportScaleChange(clamped);
    else onZoomChange?.(clamped);
  };

  const manualLocked = interactionLocked ?? false;

  const actionBtn = (disabled: boolean, danger?: boolean) =>
    light
      ? `inline-flex h-7 shrink-0 items-center rounded px-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          danger
            ? "text-rose-600 hover:bg-rose-50"
            : "text-slate-600 hover:bg-slate-100"
        }`
      : `inline-flex h-7 shrink-0 items-center rounded px-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          danger ? "text-red-400 hover:bg-zinc-800" : "text-zinc-300 hover:bg-zinc-800"
        }`;

  const toolBtn = (active: boolean) =>
    light
      ? `inline-flex h-7 shrink-0 items-center gap-0.5 rounded px-1.5 text-[11px] font-medium transition ${
          active
            ? "bg-white text-blue-600 shadow-sm ring-1 ring-blue-200"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
        }`
      : `inline-flex h-7 shrink-0 items-center gap-0.5 rounded px-1.5 text-[11px] transition ${
          active ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
        }`;

  const zoomBtn = light
    ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm text-slate-600 transition hover:bg-slate-100"
    : "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm text-zinc-300 hover:bg-zinc-800";

  const aiBtn = (primary?: boolean) =>
    `inline-flex h-7 shrink-0 items-center gap-0.5 rounded px-2 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
      primary
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : light
          ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          : "border border-blue-500/40 bg-blue-950 text-blue-200 hover:bg-blue-900"
    }`;

  const divider = (
    <div
      className={`mx-0.5 h-5 w-px shrink-0 ${light ? "bg-slate-200" : "bg-zinc-700"}`}
      aria-hidden
    />
  );

  const hasAi =
    onFullCollect ||
    onAnnotateProcess ||
    onFillBom ||
    onFillSize ||
    onEnhanceAll ||
    onExplain;

  const aiBusy = aiLoading || annotateProcessLoading;

  return (
    <div
      className={`shrink-0 ${
        light
          ? "border-b border-slate-200/80 bg-white"
          : flat
            ? "border-b border-[#333] bg-[#1a1a1a]"
            : "border-b border-zinc-700/50 bg-[#1a1a1a]"
      }`}
    >
      {/* 单行紧凑：不换行，窄屏横向滑动，把高度让给画布 */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1 [scrollbar-width:thin]">
        <div
          className={`flex shrink-0 items-center gap-1 ${
            manualLocked ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <div
            data-canvas-toolbar
            className={`inline-flex items-center gap-0.5 rounded-md p-0.5 ${
              light ? "bg-slate-100" : flat ? "bg-[#262626]" : "bg-zinc-800"
            }`}
          >
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                title={
                  t.id === "eraser" ? ANN_ACTION_LABELS.eraserHint : t.label
                }
                onPointerDown={(e) => {
                  // pointerdown 先于 window mouseup，避免切工具时被 finishDrawing 抢回「选择」
                  if (e.button !== 0) return;
                  e.preventDefault();
                  onToolChange(t.id);
                }}
                className={toolBtn(tool === t.id)}
              >
                <span className="text-xs leading-none" aria-hidden>
                  {t.icon}
                </span>
                <span className="hidden xl:inline">{t.label}</span>
              </button>
            ))}
            {onPasteImage && (
              <>
                <button
                  type="button"
                  disabled={manualLocked || pasteImageDisabled}
                  onClick={() => pasteFileRef.current?.click()}
                  className={`${toolBtn(false)} disabled:cursor-not-allowed disabled:opacity-40`}
                  title={ANN_ACTION_LABELS.pasteImageHint}
                >
                  <span className="text-xs leading-none">⧉</span>
                  <span className="hidden xl:inline">
                    {ANN_ACTION_LABELS.pasteImage}
                  </span>
                </button>
                <input
                  ref={pasteFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file || manualLocked || pasteImageDisabled) return;
                    try {
                      const dataUrl = await readImageDataUrlFromFile(file);
                      onPasteImage(dataUrl);
                    } catch {
                      /* ignore read errors */
                    }
                  }}
                />
              </>
            )}
          </div>

          {divider}

          <div className="flex shrink-0 items-center gap-1">
            {ANNOTATION_COLORS.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => onColorChange(c.value)}
                className={`h-5 w-5 shrink-0 rounded-full transition ring-offset-1 ${
                  light ? "ring-offset-white" : "ring-offset-[#1a1a1a]"
                } ${
                  color === c.value
                    ? "scale-110 ring-2 ring-slate-400"
                    : "ring-1 ring-black/10 hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          {layerVisibility && onLayerVisibilityChange ? (
            <>
              {divider}
              <div className="flex shrink-0 items-center gap-1.5">
                <label
                  className="inline-flex cursor-pointer items-center gap-0.5 text-[11px] text-slate-500"
                  title="显示/隐藏工艺标注层"
                >
                  <input
                    type="checkbox"
                    checked={layerVisibility.process}
                    onChange={(e) =>
                      onLayerVisibilityChange({
                        ...layerVisibility,
                        process: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  工艺
                </label>
                <label
                  className="inline-flex cursor-pointer items-center gap-0.5 text-[11px] text-slate-500"
                  title="显示/隐藏尺寸标注层"
                >
                  <input
                    type="checkbox"
                    checked={layerVisibility.size}
                    onChange={(e) =>
                      onLayerVisibilityChange({
                        ...layerVisibility,
                        size: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  尺寸
                </label>
              </div>
            </>
          ) : null}

          {divider}

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className={actionBtn(!canUndo)}
              title="撤销"
            >
              撤销
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              className={actionBtn(!canRedo)}
              title="重做"
            >
              重做
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={onDelete}
              className={actionBtn(!canDelete, true)}
              title="删除选中"
            >
              删除
            </button>
          </div>
        </div>

        {hasAi ? (
          <>
            {divider}
            <div className="flex shrink-0 items-center gap-1">
              {onFullCollect && (
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={onFullCollect}
                  className={aiBtn(true)}
                  title={AI_ACTION_BUTTON_TITLES["full-collect"]}
                >
                  <span>✦</span>
                  AI 一键标注
                </button>
              )}
              {onAnnotateProcess && (
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={onAnnotateProcess}
                  className={aiBtn()}
                  title={`${AI_ACTION_BUTTON_TITLES["annotate-process"]} · ${ANN_ACTION_LABELS.aiBatchProcessHint}`}
                >
                  {annotateProcessLoading
                    ? "标注中…"
                    : ANN_ACTION_LABELS.aiBatchProcess}
                </button>
              )}
              {onFillBom && (
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={onFillBom}
                  className={aiBtn()}
                  title={AI_ACTION_BUTTON_TITLES["fill-bom"]}
                >
                  AI 填物料
                </button>
              )}
              {onFillSize && (
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={onFillSize}
                  className={aiBtn()}
                  title={AI_ACTION_BUTTON_TITLES["fill-size"]}
                >
                  AI 填尺寸
                </button>
              )}
              {onEnhanceAll && (
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={onEnhanceAll}
                  className={aiBtn()}
                  title={AI_ACTION_BUTTON_TITLES.enhance}
                >
                  一键补全
                </button>
              )}
              {onExplain && (
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={onExplain}
                  className={aiBtn()}
                  title={AI_ACTION_BUTTON_TITLES.explain}
                >
                  款式评语
                </button>
              )}
            </div>
          </>
        ) : null}

        {divider}

        <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setScale(Math.max(0.25, scale - 0.1))}
            className={zoomBtn}
            title="缩小"
          >
            −
          </button>
          <span className="min-w-[2.75rem] text-center text-[11px] font-medium tabular-nums text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale(Math.min(2, scale + 0.1))}
            className={zoomBtn}
            title="放大"
          >
            +
          </button>
          {onResetViewport && (
            <button
              type="button"
              onClick={onResetViewport}
              className="rounded px-1.5 text-[11px] text-slate-600 hover:bg-slate-200"
              title="重置视图"
            >
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_ANNOTATION_COLOR };
