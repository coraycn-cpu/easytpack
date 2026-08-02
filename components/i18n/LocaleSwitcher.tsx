"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/locale";

type LocaleSwitcherProps = {
  className?: string;
  /** compact = EN | 中文 pill for tight chrome */
  size?: "sm" | "md";
};

export default function LocaleSwitcher({
  className = "",
  size = "sm",
}: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  const btn = (code: Locale, label: string) => {
    const active = locale === code;
    return (
      <button
        type="button"
        onClick={() => setLocale(code)}
        aria-pressed={active}
        className={
          size === "md"
            ? `rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-brand-soft hover:text-brand"
              }`
            : `rounded px-1.5 py-0.5 text-[11px] font-medium ${
                active
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-brand-soft hover:text-brand"
              }`
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-surface p-0.5 ${className}`}
      role="group"
      aria-label={t("common.language")}
    >
      {btn("zh", t("common.langZh"))}
      {btn("en", t("common.langEn"))}
    </div>
  );
}
