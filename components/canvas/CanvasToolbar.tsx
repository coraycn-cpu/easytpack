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
  { id: "text", label: "文字", icon: "T" },
  { id: "dimension", label: "尺寸", icon: "↔" },
  { id: "freehand", label: "画笔", icon: "✎" },
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
  const setScale = onViewportScaleChange ?? onZoomChange ?? (() => {});

  const manualLocked = interactionLocked ?? false;

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

  const aiBtn = (primary?: boolean) =>
    `inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
      primary
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : light
          ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          : "border border-blue-500/40 bg-blue-950 text-blue-200 hover:bg-blue-900"
    }`;

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
        light ? "border-b border-slate-200/80 bg-white" : flat ? "border-b border-[#333] bg-[#1a1a1a]" : "border-b border-zinc-700/50 bg-[#1a1a1a]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div
          className={`flex min-w-0 flex-1 flex-wrap items-center gap-2 ${
            manualLocked ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:inline">
            手动
          </span>
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
            {onPasteImage && (
              <>
                <button
                  type="button"
                  disabled={manualLocked || pasteImageDisabled}
                  onClick={() => pasteFileRef.current?.click()}
                  className={`${toolBtn(false)} disabled:cursor-not-allowed disabled:opacity-40`}
                  title={ANN_ACTION_LABELS.pasteImageHint}
                >
                  <span className="text-sm leading-none">⧉</span>
                  <span className="hidden sm:inline">{ANN_ACTION_LABELS.pasteImage}</span>
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

          {layerVisibility && onLayerVisibilityChange && (
            <>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-500">
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
                  工艺层
                </label>
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-500">
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
                  尺寸层
                </label>
              </div>
              <div className={`h-6 w-px ${light ? "bg-slate-200" : "bg-zinc-700"}`} />
            </>
          )}

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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAi && (
            <>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-blue-500 lg:inline">
                AI 辅助
              </span>
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
                  {annotateProcessLoading ? "标注中…" : ANN_ACTION_LABELS.aiBatchProcess}
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
              <div className={`h-6 w-px ${light ? "bg-slate-200" : "bg-zinc-700"}`} />
            </>
          )}

          <span className="text-[10px] font-medium text-slate-500">视图缩放</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setScale(Math.max(0.25, scale - 0.1))}
              className={zoomBtn}
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-slate-600">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              className={zoomBtn}
            >
              +
            </button>
            {onResetViewport && (
              <button
                type="button"
                onClick={onResetViewport}
                className="ml-0.5 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                重置
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_ANNOTATION_COLOR };
