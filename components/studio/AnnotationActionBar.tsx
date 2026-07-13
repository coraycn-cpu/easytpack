"use client";

import {
  ANN_ACTION_LABELS,
  ANN_COLOR_LEGEND,
  type AnnotationSelectionMode,
} from "@/lib/studio/annotation-ux";
import { isAnnotationLocked } from "@/lib/canvas/annotation-helpers";
import { isDimensionAnnotation } from "@/lib/canvas/size-annotations";
import { isLinkableShape } from "@/lib/canvas/part-annotations";
import type { Annotation } from "@/types/project";

type AnnotationActionBarProps = {
  selected: Annotation[];
  mode: AnnotationSelectionMode;
  interactionLocked?: boolean;
  regionAiLoading?: boolean;
  dimensionAiLoading?: boolean;
  onRegionAi?: () => void;
  onDimensionAi?: () => void;
  onMarkManual?: () => void;
  onToggleLock?: () => void;
  onDeleteSelected?: () => void;
  onOpenProcessTab?: () => void;
  onOpenSizeTab?: () => void;
  activeTab?: "process" | "bom" | "size" | "review";
};

function actionBtn(primary?: boolean, danger?: boolean) {
  if (danger) {
    return "rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50";
  }
  if (primary) {
    return "rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50";
  }
  return "rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
}

export default function AnnotationActionBar({
  selected,
  mode,
  interactionLocked,
  regionAiLoading,
  dimensionAiLoading,
  onRegionAi,
  onDimensionAi,
  onMarkManual,
  onToggleLock,
  onDeleteSelected,
  onOpenProcessTab,
  onOpenSizeTab,
  activeTab,
}: AnnotationActionBarProps) {
  if (selected.length === 0) return null;

  const count = selected.length;
  const allLocked = selected.every(isAnnotationLocked);
  const anyLocked = selected.some(isAnnotationLocked);
  const single = selected.length === 1 ? selected[0] : null;
  const singleLinkedProcess =
    single && isLinkableShape(single.type) && (single.linkedProcessIds?.length ?? 0) > 0;
  const singleLinkedSize =
    single && isDimensionAnnotation(single) && Boolean(single.linkedSizePart?.trim());

  if (mode === "mixed") {
    return (
      <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/90 p-2">
        <p className="mb-1 text-[11px] font-semibold text-amber-900">已选 {count} 项（类型混合）</p>
        <p className="mb-2 text-[10px] text-amber-800">
          请只选择「工艺方框」或「尺寸线」其中一类，操作更清晰。
        </p>
        <div className="flex flex-wrap gap-1.5">
          {onDeleteSelected && (
            <button
              type="button"
              disabled={interactionLocked || anyLocked}
              onClick={onDeleteSelected}
              className={actionBtn(false, true)}
            >
              {ANN_ACTION_LABELS.deleteSelected}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "other") {
    return (
      <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <p className="mb-1 text-[11px] font-semibold text-slate-700">已选 {count} 项装饰标注</p>
        <p className="mb-2 text-[10px] text-slate-500">箭头/文字/画笔不可关联工艺或尺寸。</p>
        <div className="flex flex-wrap gap-1.5">
          {onToggleLock && (
            <button type="button" disabled={interactionLocked} onClick={onToggleLock} className={actionBtn()}>
              {allLocked ? ANN_ACTION_LABELS.toggleUnlock : ANN_ACTION_LABELS.toggleLock}
            </button>
          )}
          {onDeleteSelected && (
            <button
              type="button"
              disabled={interactionLocked || anyLocked}
              onClick={onDeleteSelected}
              className={actionBtn(false, true)}
            >
              {ANN_ACTION_LABELS.deleteSelected}
            </button>
          )}
        </div>
      </div>
    );
  }

  const isProcess = mode === "process";
  const border = isProcess ? "border-blue-200 bg-blue-50/90" : "border-emerald-200 bg-emerald-50/90";
  const titleColor = isProcess ? "text-blue-900" : "text-emerald-900";
  const bodyColor = isProcess ? "text-blue-700" : "text-emerald-700";
  const aiPrimary = isProcess ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700";
  const aiLoading = isProcess ? regionAiLoading : dimensionAiLoading;
  const onAi = isProcess ? onRegionAi : onDimensionAi;
  const aiLabel =
    count === 1
      ? singleLinkedProcess || singleLinkedSize
        ? isProcess
          ? ANN_ACTION_LABELS.aiRegionRetry
          : ANN_ACTION_LABELS.aiDimensionRetry
        : isProcess
          ? ANN_ACTION_LABELS.aiRegion
          : ANN_ACTION_LABELS.aiDimension
      : isProcess
        ? ANN_ACTION_LABELS.aiRegion
        : ANN_ACTION_LABELS.aiDimension;

  return (
    <div className={`mb-2 rounded-lg border p-2 ${border}`}>
      <p className={`mb-1 text-[11px] font-semibold ${titleColor}`}>
        {isProcess ? `已选工艺区域 · ${count} 项` : `已选尺寸线 · ${count} 项`}
      </p>
      <p className={`mb-2 text-[10px] leading-relaxed ${bodyColor}`}>
        {count > 1
          ? "批量：锁定 / 标记手动 / 删除。AI 识别请只选 1 项。"
          : singleLinkedProcess || singleLinkedSize
            ? "已关联数据。修改形状或关联后建议「标记为手动」。"
            : isProcess
              ? "先 AI 识别此区域，或在工艺 Tab 勾选行手动关联。"
              : "先 AI 识别此尺寸，或在尺寸 Tab 勾选行手动关联。"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {onAi && count === 1 && (
          <button
            type="button"
            disabled={interactionLocked || aiLoading || anyLocked}
            onClick={onAi}
            title={isProcess ? "基于当前画板识别框内工艺" : "基于当前画板识别尺寸数值"}
            className={`rounded-md px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50 ${aiPrimary}`}
          >
            {aiLoading ? "识别中…" : aiLabel}
          </button>
        )}
        {isProcess && activeTab !== "process" && onOpenProcessTab && count === 1 && (
          <button type="button" disabled={interactionLocked} onClick={onOpenProcessTab} className={actionBtn()}>
            {ANN_ACTION_LABELS.linkProcessTab}
          </button>
        )}
        {!isProcess && activeTab !== "size" && onOpenSizeTab && count === 1 && (
          <button type="button" disabled={interactionLocked} onClick={onOpenSizeTab} className={actionBtn()}>
            {ANN_ACTION_LABELS.linkSizeTab}
          </button>
        )}
        {onMarkManual && (
          <button type="button" disabled={interactionLocked} onClick={onMarkManual} className={actionBtn()}>
            {ANN_ACTION_LABELS.markManual}
          </button>
        )}
        {onToggleLock && (
          <button type="button" disabled={interactionLocked} onClick={onToggleLock} className={actionBtn()}>
            {allLocked ? ANN_ACTION_LABELS.toggleUnlock : ANN_ACTION_LABELS.toggleLock}
          </button>
        )}
        {onDeleteSelected && (
          <button
            type="button"
            disabled={interactionLocked || anyLocked}
            onClick={onDeleteSelected}
            className={actionBtn(false, true)}
          >
            {ANN_ACTION_LABELS.deleteSelected}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[9px] text-slate-500">{ANN_COLOR_LEGEND}</p>
    </div>
  );
}
