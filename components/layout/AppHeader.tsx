"use client";

import AuthHeaderControls from "@/components/auth/AuthHeaderControls";
import AiCreditsChip from "@/components/auth/AiCreditsChip";
import BrandMark from "@/components/brand/BrandMark";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
import Link from "next/link";

export default function AppHeader() {
  const { t } = useLocale();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <BrandMark
          variant="short"
          nameClassName="text-lg leading-none"
          iconClassName="h-7 w-7"
        />
        <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
          <LocaleSwitcher />
          <Link
            href="/projects"
            className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-muted hover:bg-brand-soft hover:text-brand"
          >
            {t("common.projects")}
          </Link>
          <Link
            href="/account"
            className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-muted hover:bg-brand-soft hover:text-brand"
          >
            {t("common.account")}
          </Link>
          <AiCreditsChip />
          <AuthHeaderControls />
        </nav>
      </div>
    </header>
  );
}
