"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";
import type { Artboard } from "@/types/project";

type ViewRegenerateOverlaysProps = {
  slots: ArtboardSlot[];
  artboards: Artboard[];
  primaryArtboardId?: string;
  contentOffsetX: number;
  contentOffsetY: number;
  fitScale: number;
  regeneratingArtboardId?: string | null;
  interactionLocked?: boolean;
  onRegenerateView?: (artboardId: string, correctionPrompt: string) => void;
  /** 从彩图画板转换线稿 */
  onGenerateLineArt?: (sourceArtboardId: string) => void;
  onDeleteArtboard?: (artboardId: string) => void;
};

export default function ViewRegenerateOverlays({
  slots,
  artboards,
  primaryArtboardId,
  contentOffsetX,
  contentOffsetY,
  fitScale,
  regeneratingArtboardId,
  interactionLocked,
  onRegenerateView,
  onGenerateLineArt,
  onDeleteArtboard,
}: ViewRegenerateOverlaysProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const ab of artboards) {
        if (!ab.viewImageMeta) continue;
        const isPrimaryFlatFront =
          ab.id === primaryArtboardId && ab.viewImageMeta.kind === "flat_front";
        if (ab.id === primaryArtboardId && !isPrimaryFlatFront) continue;
        const saved = ab.viewImageMeta.correctionPrompt;
        if (saved && next[ab.id] === undefined) {
          next[ab.id] = saved;
        }
      }
      return next;
    });
  }, [artboards, primaryArtboardId]);

  const setDraft = useCallback((id: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const focusDraftInput = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: true }));
    requestAnimationFrame(() => textareaRefs.current[id]?.focus());
  }, []);

  if (!primaryArtboardId) return null;
  if (!onRegenerateView && !onGenerateLineArt) return null;

  return (
    <>
      {slots.map((slot) => {
        const ab = artboards.find((a) => a.id === slot.id);
        if (!ab || !ab.viewImageMeta) return null;

        const isPrimaryFlatFront =
          ab.id === primaryArtboardId && ab.viewImageMeta.kind === "flat_front";
        if (ab.id === primaryArtboardId && !isPrimaryFlatFront) return null;

        const offset = ab.imageOffset ?? { x: 0, y: 0 };
        const imageLeft =
          (contentOffsetX + slot.origin.x + slot.imageFit.x + offset.x) * fitScale;
        const imageTop =
          (contentOffsetY + slot.origin.y + slot.imageFit.y + offset.y) * fitScale;
        const imageWidth = slot.imageFit.width * fitScale;
        const imageHeight = slot.imageFit.height * fitScale;

        const bottomLeft = imageLeft;
        const bottomTop = imageTop + imageHeight + 4 * fitScale;
        const bottomWidth = Math.max(imageWidth, 120);

        const busy = regeneratingArtboardId === ab.id;
        const draft = drafts[ab.id] ?? "";
        const hasDraft = draft.trim().length > 0;
        const isExpanded = expanded[ab.id] ?? false;
        const locked = interactionLocked || busy;

        const kind = ab.viewImageMeta.kind;
        const isLineArt = kind === "line_art";
        const canConvertToLineArt =
          !isLineArt && Boolean(onGenerateLineArt) && Boolean(ab.imageDataUrl);

        const handleDelete = () => {
          if (!onDeleteArtboard || locked) return;
          if (window.confirm(`删除「${ab.name}」？此操作不可撤销。`)) {
            onDeleteArtboard(ab.id);
          }
        };

        const handleRegenerate = () => {
          if (!onRegenerateView || locked) return;
          if (!hasDraft) {
            focusDraftInput(ab.id);
            return;
          }
          onRegenerateView(ab.id, draft.trim());
        };

        const isFlatFront = kind === "flat_front";
        const regenSourceHint = isLineArt
          ? "基于绑定彩图重新转换线稿"
          : isFlatFront
            ? "基于原参考图重新生成主款平铺"
            : "基于主款平铺图重新生成";

        return (
          <div key={`view-overlay-${ab.id}`}>
            {canConvertToLineArt && (
              <div
                className="pointer-events-none absolute z-[13]"
                style={{
                  left: imageLeft,
                  top: imageTop,
                  width: imageWidth,
                  height: imageHeight,
                }}
              >
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onGenerateLineArt?.(ab.id)}
                  title="按当前彩图严格转换为线稿"
                  className="pointer-events-auto absolute right-2 top-2 rounded-md border border-emerald-400 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {busy ? "生成中…" : "生成线稿"}
                </button>
              </div>
            )}

            {onRegenerateView && (
              <div
                className="absolute z-[12]"
                style={{
                  left: bottomLeft,
                  top: bottomTop,
                  width: bottomWidth,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="rounded border border-violet-200/80 bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm">
                  <p className="mb-0.5 px-0.5 text-[9px] leading-snug text-violet-700/90">
                    {regenSourceHint}
                  </p>
                  {isExpanded && (
                    <textarea
                      ref={(el) => {
                        textareaRefs.current[ab.id] = el;
                      }}
                      value={draft}
                      onChange={(e) => setDraft(ab.id, e.target.value)}
                      placeholder={
                        isLineArt
                          ? "必填：如「花纹线条再清晰」「袖长与彩图一致」"
                          : "必填：说明要修正什么，如「领口罗纹再清晰」「颜色偏深」"
                      }
                      rows={2}
                      disabled={locked}
                      className="mb-1 w-full resize-none rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
                    />
                  )}
                  {!isExpanded && !hasDraft && (
                    <p className="mb-1 px-0.5 text-[9px] leading-snug text-slate-500">
                      重新生成前请先填写修正词
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={handleRegenerate}
                      title={
                        hasDraft
                          ? "按修正词重新生成"
                          : "请先展开并填写修正提示词"
                      }
                      className={`min-w-0 flex-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        hasDraft
                          ? "bg-violet-600 text-white hover:bg-violet-700"
                          : "border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      {busy ? "生成中…" : hasDraft ? "重新生成" : "填写修正词"}
                    </button>
                    {onDeleteArtboard && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={handleDelete}
                        className="shrink-0 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        删除
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => toggleExpanded(ab.id)}
                      title={isExpanded ? "收起修正提示词" : "展开修正提示词"}
                      className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
