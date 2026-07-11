"use client";

import { useEffect, useState } from "react";
import SizeStandardFields, {
  defaultSizeStandard,
  type SizeStandardInput,
} from "@/components/studio/SizeStandardFields";

type SizeChartAiDialogProps = {
  open: boolean;
  initialRegion?: SizeStandardInput["regionStandard"];
  initialSampleSize?: string;
  onConfirm: (input: SizeStandardInput) => void;
  onCancel: () => void;
};

export default function SizeChartAiDialog({
  open,
  initialRegion = "cn",
  initialSampleSize,
  onConfirm,
  onCancel,
}: SizeChartAiDialogProps) {
  const [value, setValue] = useState<SizeStandardInput>(
    initialSampleSize
      ? { regionStandard: initialRegion, sampleSize: initialSampleSize }
      : defaultSizeStandard(initialRegion),
  );

  useEffect(() => {
    if (!open) return;
    setValue(
      initialSampleSize
        ? { regionStandard: initialRegion, sampleSize: initialSampleSize }
        : defaultSizeStandard(initialRegion),
    );
  }, [open, initialRegion, initialSampleSize]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="size-ai-dialog-title"
      >
        <h2 id="size-ai-dialog-title" className="text-sm font-semibold text-slate-800">
          AI 填尺寸表
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          确认区域标准与样衣基准码，AI 将解析测量点并估算基准码数值。
        </p>

        <div className="mt-4">
          <SizeStandardFields value={value} onChange={setValue} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!value.sampleSize.trim()}
            onClick={() =>
              onConfirm({
                regionStandard: value.regionStandard,
                sampleSize: value.sampleSize.trim(),
              })
            }
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            开始分析
          </button>
        </div>
      </div>
    </div>
  );
}
