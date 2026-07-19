"use client";

import DataExpandShell from "@/components/studio/DataExpandShell";
import { STYLE_REVIEW_MAX } from "@/types/process";

type ReviewExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
};

export default function ReviewExpandDialog({
  open,
  onClose,
  value,
  onChange,
}: ReviewExpandDialogProps) {
  const text = value ?? "";

  return (
    <DataExpandShell
      open={open}
      onClose={onClose}
      title="款式评语"
      subtitle={`面向版师/车版/设计师：款式特点、面料建议、工艺建议、注意事项（≤${STYLE_REVIEW_MAX}字）。修改即时保存。`}
      footerLeft={
        <span className="text-[11px] text-slate-400">
          {text.length}/{STYLE_REVIEW_MAX} 字
        </span>
      }
    >
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value.slice(0, STYLE_REVIEW_MAX))}
        rows={22}
        maxLength={STYLE_REVIEW_MAX}
        placeholder={`【款式特点】…\n【面料建议】…\n【工艺建议】…\n【注意事项】…`}
        className="min-h-[min(60vh,520px)] w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-[13px] leading-relaxed text-slate-700 outline-none focus:border-blue-400"
      />
    </DataExpandShell>
  );
}
