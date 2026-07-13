"use client";

import { photoTypeLabel } from "@/lib/intake/apply-intent";
import type { IntakeData } from "@/types/project";

type FlatFrontChoiceActionsProps = {
  onGenerate: () => void;
  onSkip: () => void;
  generateLoading?: boolean;
  compact?: boolean;
};

/** 模特/拼贴图：生成平铺正面 vs 跳过 */
export function FlatFrontChoiceActions({
  onGenerate,
  onSkip,
  generateLoading,
  compact,
}: FlatFrontChoiceActionsProps) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "mt-2" : "mt-3"}`}>
      <button
        type="button"
        disabled={generateLoading}
        onClick={onGenerate}
        className="w-full rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
      >
        {generateLoading ? "生成中…" : "生成平铺图并继续"}
      </button>
      <button
        type="button"
        disabled={generateLoading}
        onClick={onSkip}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        暂不生成，直接进入画布
      </button>
    </div>
  );
}

type FlatFrontPromptStepProps = {
  intake: IntakeData;
  onGenerate: () => void;
  onSkip: () => void;
  generateLoading?: boolean;
};

/** 已确认单款、需平铺正面时的独立提示（如自动识别单款无需选款弹窗） */
export default function FlatFrontPromptStep({
  intake,
  onGenerate,
  onSkip,
  generateLoading,
}: FlatFrontPromptStepProps) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <p className="text-sm font-semibold text-slate-800">生成平铺正面主款图？</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-600">
        检测到{photoTypeLabel(intake.photoType)}，建议生成平铺正面便于标注工艺与尺寸。
        {photoTypeLabel(intake.photoType)}原图会保留在画布参考画板，可修正后重新生成。
      </p>
      <FlatFrontChoiceActions
        onGenerate={onGenerate}
        onSkip={onSkip}
        generateLoading={generateLoading}
      />
    </div>
  );
}
