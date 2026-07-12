"use client";

import { useCallback, useEffect, useState } from "react";
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
}: ViewRegenerateOverlaysProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const ab of artboards) {
        if (!ab.viewImageMeta || ab.id === primaryArtboardId) continue;
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

  if (!onRegenerateView || !primaryArtboardId) return null;

  return (
    <>
      {slots.map((slot) => {
        const ab = artboards.find((a) => a.id === slot.id);
        if (!ab || ab.id === primaryArtboardId || !ab.viewImageMeta) return null;

        const offset = ab.imageOffset ?? { x: 0, y: 0 };
        const left =
          (contentOffsetX + slot.origin.x + slot.imageFit.x + offset.x) * fitScale;
        const top =
          (contentOffsetY +
            slot.origin.y +
            slot.imageFit.y +
            offset.y +
            slot.imageFit.height +
            6) *
          fitScale;
        const width = slot.imageFit.width * fitScale;
        const busy = regeneratingArtboardId === ab.id;
        const draft = drafts[ab.id] ?? "";

        return (
          <div
            key={`regen-${ab.id}`}
            className="absolute z-[12]"
            style={{ left, top, width: Math.max(width, 140) }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="rounded-md border border-violet-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm">
              <p className="mb-1 text-[9px] font-medium text-violet-700">
                AI · {ab.name} · 修正后重新生成
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(ab.id, e.target.value)}
                placeholder="如：领口罗纹再清晰、颜色偏深、袖口包边不对"
                rows={2}
                disabled={interactionLocked || busy}
                className="w-full resize-none rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={interactionLocked || busy}
                onClick={() => onRegenerateView(ab.id, draft.trim())}
                className="mt-1 w-full rounded bg-violet-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "重新生成中…" : "重新生成"}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
