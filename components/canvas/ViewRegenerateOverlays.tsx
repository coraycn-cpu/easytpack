"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";
import { ANN_ACTION_LABELS } from "@/lib/studio/annotation-ux";
import type { Artboard } from "@/types/project";

export type ArtboardCropUi = {
  artboardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  onRegenerateView?: (artboardId: string, correctionPrompt: string) => void;
  /** 从彩图画板转换线稿 */
  onGenerateLineArt?: (sourceArtboardId: string) => void;
  onDeleteArtboard?: (artboardId: string) => void;
};

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
    neutral:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    primary:
      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    accent:
      "border-violet-300 bg-violet-600 text-white hover:bg-violet-700",
    danger: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    success:
      "border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      title={title ?? label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`pointer-events-auto w-full rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {label}
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
        const saved = ab.viewImageMeta.correctionPrompt;
        if (saved && next[ab.id] === undefined) {
          next[ab.id] = saved;
        }
      }
      return next;
    });
  }, [artboards]);

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
        const imageWidth = slot.imageFit.width * fitScale;

        const railLeft = imageLeft + imageWidth + 6 * Math.max(fitScale, 0.5);
        const railTop = imageTop;
        const railWidth = 88;

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

        const canConvertToLineArt =
          Boolean(meta) &&
          !isLineArt &&
          !isProtectedPrimary &&
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

        const draft = drafts[ab.id] ?? "";
        const hasDraft = draft.trim().length > 0;
        const isExpanded = expanded[ab.id] ?? false;

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

        const hasAnyAction =
          canConvertToLineArt ||
          showRegen ||
          deletable ||
          aiDeletable ||
          croppable ||
          croppingThis;

        if (!hasAnyAction) return null;

        return (
          <div
            key={`view-rail-${ab.id}`}
            className="pointer-events-none absolute z-[13]"
            style={{
              left: railLeft,
              top: railTop,
              width: railWidth,
            }}
            data-no-canvas-zoom
          >
            <div className="pointer-events-auto flex flex-col gap-1.5 rounded-lg border border-slate-200/90 bg-white/95 p-1.5 shadow-md backdrop-blur-sm">
              {croppingThis ? (
                <>
                  <RailButton
                    label={ANN_ACTION_LABELS.cropConfirm}
                    tone="success"
                    disabled={locked}
                    onClick={() => onConfirmCrop?.()}
                  />
                  <RailButton
                    label={ANN_ACTION_LABELS.cropCancel}
                    disabled={locked}
                    onClick={() => onCancelCrop?.()}
                  />
                </>
              ) : (
                <>
                  {croppable && (
                    <RailButton
                      label={ANN_ACTION_LABELS.cropImage}
                      title={ANN_ACTION_LABELS.cropImageHint}
                      tone="primary"
                      disabled={locked}
                      onClick={() => onStartCrop?.(ab.id)}
                    />
                  )}
                  {canConvertToLineArt && (
                    <RailButton
                      label={busy ? "生成中…" : "生成线稿"}
                      title="按当前彩图严格转换为线稿"
                      tone="success"
                      disabled={locked}
                      onClick={() => onGenerateLineArt?.(ab.id)}
                    />
                  )}
                  {showRegen && (
                    <>
                      {isExpanded && (
                        <textarea
                          ref={(el) => {
                            textareaRefs.current[ab.id] = el;
                          }}
                          value={draft}
                          onChange={(e) => setDraft(ab.id, e.target.value)}
                          placeholder={
                            isLineArt
                              ? "修正：花纹更清晰…"
                              : "修正：领口再清晰…"
                          }
                          rows={3}
                          disabled={locked}
                          className="w-full resize-none rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                      )}
                      <RailButton
                        label={
                          busy
                            ? "生成中…"
                            : hasDraft
                              ? "重新生成"
                              : "填写修正词"
                        }
                        title={
                          hasDraft
                            ? "按修正词重新生成"
                            : "请先展开并填写修正提示词"
                        }
                        tone={hasDraft ? "accent" : "neutral"}
                        disabled={locked}
                        onClick={handleRegenerate}
                      />
                      <RailButton
                        label={isExpanded ? "收起修正" : "展开修正"}
                        disabled={locked}
                        onClick={() => toggleExpanded(ab.id)}
                      />
                    </>
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
        );
      })}
    </>
  );
}
