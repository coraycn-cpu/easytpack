"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";
import { ANN_ACTION_LABELS } from "@/lib/studio/annotation-ux";
import {
  COMM_PACK_COPY,
  REGION_EDIT_LABELS,
  WHOLE_IMAGE_CORRECTION_CHIPS,
} from "@/lib/studio/region-edit-ux";
import {
  COLLAGE_REFERENCE_NAME,
  MODEL_REFERENCE_NAME,
} from "@/lib/studio/reference-artboard";
import type { Artboard } from "@/types/project";

function isPhotoReferenceArtboard(ab: Artboard): boolean {
  return (
    ab.name === MODEL_REFERENCE_NAME ||
    ab.name === COLLAGE_REFERENCE_NAME ||
    ab.name === "参考图"
  );
}

export type ArtboardCropUi = {
  artboardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mode?: "crop" | "regionEdit";
} | null;

type ViewRegenerateOverlaysProps = {
  slots: ArtboardSlot[];
  artboards: Artboard[];
  primaryArtboardId?: string;
  activeArtboardId?: string;
  contentOffsetX: number;
  contentOffsetY: number;
  fitScale: number;
  regeneratingArtboardId?: string | null;
  interactionLocked?: boolean;
  toolIsSelect?: boolean;
  cropSession?: ArtboardCropUi;
  onStartCrop?: (artboardId: string) => void;
  onConfirmCrop?: () => void;
  onCancelCrop?: () => void;
  canCropArtboard?: (artboard: Artboard) => boolean;
  /** 新增：开始选区重绘（仿剪裁框选，不改现有工具） */
  onStartRegionEdit?: (artboardId: string) => void;
  canRegionEditArtboard?: (artboard: Artboard) => boolean;
  /** 可恢复上一版图的画板 */
  undoableArtboardIds?: string[];
  onUndoArtboardImage?: (artboardId: string) => void;
  onRegenerateView?: (artboardId: string, correctionPrompt: string) => void;
  onGenerateLineArt?: (sourceArtboardId: string) => void;
  onDeleteArtboard?: (artboardId: string) => void;
};

function verticalLabel(text: string) {
  return text.replace(/\s+/g, "").split("").join("\n");
}

function RailButton({
  label,
  title,
  disabled,
  onClick,
  tone = "neutral",
}: {
  label: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "neutral" | "primary" | "accent" | "danger" | "success";
}) {
  const tones: Record<string, string> = {
    neutral: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    primary: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    accent: "border-violet-300 bg-violet-600 text-white hover:bg-violet-700",
    danger: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    success: "border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      title={title ?? label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`pointer-events-auto flex w-7 shrink-0 items-center justify-center rounded-md border px-0.5 py-1.5 text-[11px] font-semibold leading-[1.15] tracking-tight shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
      style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
    >
      {verticalLabel(label)}
    </button>
  );
}

export default function ViewRegenerateOverlays({
  slots,
  artboards,
  primaryArtboardId,
  activeArtboardId,
  contentOffsetX,
  contentOffsetY,
  fitScale,
  regeneratingArtboardId,
  interactionLocked,
  toolIsSelect = true,
  cropSession = null,
  onStartCrop,
  onConfirmCrop,
  onCancelCrop,
  canCropArtboard,
  onStartRegionEdit,
  canRegionEditArtboard,
  undoableArtboardIds = [],
  onUndoArtboardImage,
  onRegenerateView,
  onGenerateLineArt,
  onDeleteArtboard,
}: ViewRegenerateOverlaysProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [composerId, setComposerId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const ab of artboards) {
        if (!ab.viewImageMeta) continue;
        const saved = ab.viewImageMeta.correctionPrompt;
        if (saved && next[ab.id] === undefined) {
          next[ab.id] = saved;
        }
      }
      return next;
    });
  }, [artboards]);

  useEffect(() => {
    if (!composerId) return;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [composerId]);

  const setDraft = useCallback((id: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const openComposer = useCallback((id: string) => {
    setComposerId(id);
  }, []);

  const closeComposer = useCallback(() => setComposerId(null), []);

  const composerAb = composerId
    ? artboards.find((a) => a.id === composerId)
    : null;
  const composerDraft = composerId ? (drafts[composerId] ?? "") : "";
  const composerBusy =
    Boolean(composerId) && regeneratingArtboardId === composerId;
  const composerLocked = Boolean(interactionLocked || composerBusy);
  const composerIsLineArt = composerAb?.viewImageMeta?.kind === "line_art";

  const submitComposer = () => {
    if (!composerId || !onRegenerateView || composerLocked) return;
    const text = composerDraft.trim();
    if (!text) {
      textareaRef.current?.focus();
      return;
    }
    onRegenerateView(composerId, text);
    setComposerId(null);
  };

  return (
    <>
      {slots.map((slot) => {
        const ab = artboards.find((a) => a.id === slot.id);
        if (!ab?.imageDataUrl) return null;

        const offset = ab.imageOffset ?? { x: 0, y: 0 };
        const imageLeft =
          (contentOffsetX + slot.origin.x + slot.imageFit.x + offset.x) * fitScale;
        const imageTop =
          (contentOffsetY + slot.origin.y + slot.imageFit.y + offset.y) * fitScale;
        const scale = ab.imageScale ?? { x: 1, y: 1 };
        const imageWidth = slot.imageFit.width * fitScale * scale.x;

        const railLeft = imageLeft + imageWidth + 4 * Math.max(fitScale, 0.5);
        const railTop = imageTop;
        const railWidth = 32;

        const busy = regeneratingArtboardId === ab.id;
        const locked = Boolean(interactionLocked || busy);
        const isActive = ab.id === activeArtboardId;
        const meta = ab.viewImageMeta;
        const kind = meta?.kind;
        const isLineArt = kind === "line_art";
        const isPrimaryFlatFront =
          Boolean(primaryArtboardId) &&
          ab.id === primaryArtboardId &&
          kind === "flat_front";
        const isProtectedPrimary =
          Boolean(primaryArtboardId) &&
          ab.id === primaryArtboardId &&
          !isPrimaryFlatFront;

        // 任意彩图（含直接上传的平铺主款）均可转线稿；不要求 viewImageMeta
        // 受保护主款仅限制「修正/删除」，不挡线稿（否则平铺上传主款看不到按钮）
        const canConvertToLineArt =
          Boolean(ab.imageDataUrl) &&
          !isLineArt &&
          !isPhotoReferenceArtboard(ab) &&
          Boolean(onGenerateLineArt);

        const showRegen =
          Boolean(meta) &&
          Boolean(onRegenerateView) &&
          !isProtectedPrimary;

        const deletable =
          Boolean(onDeleteArtboard) &&
          Boolean(primaryArtboardId) &&
          ab.id !== primaryArtboardId &&
          !meta &&
          toolIsSelect &&
          !interactionLocked &&
          !cropSession;

        const aiDeletable =
          Boolean(onDeleteArtboard) &&
          Boolean(meta) &&
          !isProtectedPrimary &&
          ab.id !== primaryArtboardId;

        const croppable =
          Boolean(canCropArtboard?.(ab)) &&
          isActive &&
          toolIsSelect &&
          !interactionLocked;

        const croppingThis = cropSession?.artboardId === ab.id;
        const regionEditingThis =
          croppingThis && cropSession?.mode === "regionEdit";
        const hasDraft = (drafts[ab.id] ?? "").trim().length > 0;
        const canRegion =
          Boolean(canRegionEditArtboard?.(ab) ?? onStartRegionEdit) &&
          Boolean(ab.imageDataUrl) &&
          isActive &&
          toolIsSelect &&
          !interactionLocked;
        const canUndoImage =
          Boolean(onUndoArtboardImage) &&
          undoableArtboardIds.includes(ab.id) &&
          !interactionLocked;

        const handleDelete = () => {
          if (!onDeleteArtboard || locked) return;
          if (window.confirm(`删除「${ab.name}」？此操作不可撤销。`)) {
            onDeleteArtboard(ab.id);
          }
        };

        const hasAnyAction =
          canConvertToLineArt ||
          showRegen ||
          deletable ||
          aiDeletable ||
          croppable ||
          croppingThis ||
          canRegion ||
          canUndoImage;

        const imageTopBadge =
          meta != null
            ? COMM_PACK_COPY.aiDraftBadge
            : isPhotoReferenceArtboard(ab)
              ? COMM_PACK_COPY.originalBadge
              : null;

        if (!hasAnyAction && !imageTopBadge) return null;

        return (
          <div key={`view-rail-${ab.id}`}>
            {imageTopBadge ? (
              <div
                className="pointer-events-none absolute z-[12]"
                style={{
                  left: imageLeft,
                  top: Math.max(0, imageTop - 2),
                }}
                data-no-canvas-zoom
              >
                <span className="rounded bg-slate-800/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {imageTopBadge}
                </span>
              </div>
            ) : null}

            {hasAnyAction ? (
              <div
                className="pointer-events-none absolute z-[13]"
                style={{
                  left: railLeft,
                  top: railTop,
                  width: railWidth,
                }}
                data-no-canvas-zoom
              >
                <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-lg border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur-sm">
                  {croppingThis ? (
                    <>
                      <RailButton
                        label={
                          regionEditingThis
                            ? REGION_EDIT_LABELS.confirmNext
                            : "确认"
                        }
                        title={
                          regionEditingThis
                            ? REGION_EDIT_LABELS.dialogHint
                            : ANN_ACTION_LABELS.cropConfirm
                        }
                        tone="success"
                        disabled={locked}
                        onClick={() => onConfirmCrop?.()}
                      />
                      <RailButton
                        label="取消"
                        title={
                          regionEditingThis
                            ? REGION_EDIT_LABELS.cancel
                            : ANN_ACTION_LABELS.cropCancel
                        }
                        disabled={locked}
                        onClick={() => onCancelCrop?.()}
                      />
                    </>
                  ) : (
                    <>
                      {croppable && (
                        <RailButton
                          label="剪裁"
                          title={ANN_ACTION_LABELS.cropImageHint}
                          tone="primary"
                          disabled={locked}
                          onClick={() => onStartCrop?.(ab.id)}
                        />
                      )}
                      {canRegion && (
                        <RailButton
                          label={REGION_EDIT_LABELS.rail}
                          title={REGION_EDIT_LABELS.railHint}
                          tone="accent"
                          disabled={locked}
                          onClick={() => onStartRegionEdit?.(ab.id)}
                        />
                      )}
                      {canUndoImage && (
                        <RailButton
                          label={REGION_EDIT_LABELS.undoImage}
                          title={REGION_EDIT_LABELS.undoImageHint}
                          disabled={locked}
                          onClick={() => onUndoArtboardImage?.(ab.id)}
                        />
                      )}
                      {canConvertToLineArt && (
                        <RailButton
                          label={busy ? "生成中" : "线稿"}
                          title="按当前彩图严格转换为线稿"
                          tone="success"
                          disabled={locked}
                          onClick={() => onGenerateLineArt?.(ab.id)}
                        />
                      )}
                      {showRegen && (
                        <RailButton
                          label={busy ? "生成中" : hasDraft ? "重生成" : "修正"}
                          title={
                            hasDraft
                              ? "整图按修正词重生成（局部小改请优先用「局部」）"
                              : "整图修正（局部小改请优先用「局部」）"
                          }
                          tone={hasDraft ? "accent" : "neutral"}
                          disabled={locked}
                          onClick={() => openComposer(ab.id)}
                        />
                      )}
                      {(deletable || aiDeletable) && (
                        <RailButton
                          label="删除"
                          tone="danger"
                          disabled={locked}
                          onClick={handleDelete}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {composerId &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4"
            onClick={closeComposer}
            data-no-canvas-zoom
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  修正提示词
                  {composerAb?.name ? ` · ${composerAb.name}` : ""}
                </h3>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  onClick={closeComposer}
                >
                  关闭
                </button>
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                {composerIsLineArt
                  ? "基于当前这张线稿做局部修改（不是从彩图重抽）。例如：「花纹线条再清晰」「领口再圆一点」。"
                  : "基于当前这张款式图做局部修改（不是回到原上传图重抽）。例如：「去掉假模特改真平铺」「领口罗纹再清晰」。局部小改优先用画板旁「局部」。"}
              </p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {WHOLE_IMAGE_CORRECTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={composerLocked}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                    onClick={() => {
                      const cur = drafts[composerId] ?? "";
                      const next = cur.trim()
                        ? `${cur.trim()}；${chip}`
                        : chip;
                      setDraft(composerId, next);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={composerDraft}
                onChange={(e) => setDraft(composerId, e.target.value)}
                placeholder={
                  composerIsLineArt
                    ? "必填：修正要求…"
                    : "必填：如「改为衣服平摊白底、不要人台」"
                }
                rows={6}
                disabled={composerLocked}
                className="mb-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400 disabled:opacity-60"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={closeComposer}
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={composerLocked || !composerDraft.trim()}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={submitComposer}
                >
                  {composerBusy ? "生成中…" : "提交并重新生成"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
