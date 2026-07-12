"use client";

import { useState } from "react";
import { photoTypeLabel, needsFlatFrontAfterGarmentPick } from "@/lib/intake/apply-intent";
import type { IntakeData, TargetGarment, VisibleGarment } from "@/types/project";

type GarmentPickerStepProps = {
  intake: IntakeData;
  imagePreview?: string | null;
  onConfirm: (garment: TargetGarment) => void;
  compact?: boolean;
};

export default function GarmentPickerStep({
  intake,
  imagePreview,
  onConfirm,
  compact = false,
}: GarmentPickerStepProps) {
  const garments: VisibleGarment[] =
    intake.visibleGarments && intake.visibleGarments.length > 0
      ? intake.visibleGarments
      : intake.detectedCategory
        ? [
            {
              id: "g1",
              label: intake.suggestedTitle ?? intake.detectedCategory,
              category: intake.detectedCategory,
            },
          ]
        : [];

  const defaultId =
    intake.recommendedGarmentId &&
    garments.some((g) => g.id === intake.recommendedGarmentId)
      ? intake.recommendedGarmentId
      : garments[0]?.id ?? "";

  const [selectedId, setSelectedId] = useState(defaultId);

  const selected = garments.find((g) => g.id === selectedId);

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      id: selected.id,
      label: selected.label,
      category: selected.category,
    });
  };

  if (garments.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        未能识别可见款式，请补充文字描述或更换更清晰的图片。
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-violet-200 bg-violet-50/50 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-sm font-semibold text-slate-800">确认目标单款</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-600">
        一个项目只处理一件服装。当前为{photoTypeLabel(intake.photoType)}
        ，请选择本次 Tech Pack 要做的款式：
        {needsFlatFrontAfterGarmentPick({
          ...intake,
          garmentConfirmed: true,
          targetGarment: selected ?? intake.targetGarment,
          flatFrontGenerated: false,
        }) && (
          <span className="mt-1 block text-violet-700">
            确认后将自动从{photoTypeLabel(intake.photoType)}生成平铺正面主款图
          </span>
        )}
      </p>

      {imagePreview && !compact && (
        <img
          src={imagePreview}
          alt="参考图"
          className="mx-auto mt-3 max-h-36 rounded-lg border border-slate-200 bg-white object-contain"
        />
      )}

      <div className="mt-3 space-y-1.5">
        {garments.map((g) => {
          const active = g.id === selectedId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                active
                  ? "border-violet-400 bg-white ring-1 ring-violet-200"
                  : "border-slate-200 bg-white/80 hover:border-violet-200"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active ? "border-violet-600 bg-violet-600" : "border-slate-300"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800">{g.label}</span>
                <span className="text-[10px] text-slate-500">{g.category}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={handleConfirm}
        className="mt-3 w-full rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
      >
        确认，继续
      </button>
    </div>
  );
}
