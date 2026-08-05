"use client";

import DataExpandShell from "@/components/studio/DataExpandShell";
import { useLocale } from "@/components/i18n/LocaleProvider";
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
  const { t } = useLocale();
  const text = value ?? "";

  return (
    <DataExpandShell
      open={open}
      onClose={onClose}
      title={t("panel.reviewTitle")}
      subtitle={t("panel.reviewSubtitle", { max: STYLE_REVIEW_MAX })}
      footerLeft={
        <span className="text-[11px] text-slate-400">
          {t("panel.charCount", { n: text.length, max: STYLE_REVIEW_MAX })}
        </span>
      }
    >
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value.slice(0, STYLE_REVIEW_MAX))}
        rows={22}
        maxLength={STYLE_REVIEW_MAX}
        placeholder={t("panel.reviewPh")}
        className="min-h-[min(60vh,520px)] w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-[13px] leading-relaxed text-slate-700 outline-none focus:border-blue-400"
      />
    </DataExpandShell>
  );
}
