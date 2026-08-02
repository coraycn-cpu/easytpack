"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_SITE,
  BRAND_SITE_URL,
  BRAND_SLOGAN,
} from "@/lib/brand";
import { GUIDE_PAGE_PATH } from "@/lib/content/guide-faq";

type BrandFooterProps = {
  className?: string;
  /** 说明页本身可关掉「功能介绍」自链 */
  showGuideLink?: boolean;
};

/** 首页/说明页底部：官网 + slogan + 说明入口 + 业务联系 */
export default function BrandFooter({
  className = "",
  showGuideLink = true,
}: BrandFooterProps) {
  const { t } = useLocale();

  return (
    <footer
      className={`pointer-events-auto text-center ${className}`}
      aria-label={t("footer.aria")}
    >
      <a
        href={BRAND_SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium tracking-wide text-muted hover:text-brand"
      >
        {BRAND_SITE}
      </a>
      <p className="mt-1 text-[10px] leading-snug text-muted/80">
        {BRAND_SLOGAN}
      </p>
      {showGuideLink ? (
        <p className="mt-2 text-[11px]">
          <Link
            href={GUIDE_PAGE_PATH}
            className="font-medium text-brand hover:text-brand-dark"
          >
            {t("footer.guide")}
          </Link>
        </p>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {t("footer.contact")}
        <a
          href={`mailto:${BRAND_CONTACT_EMAIL}`}
          className="font-medium text-brand hover:text-brand-dark"
        >
          {BRAND_CONTACT_EMAIL}
        </a>
        <span className="mx-1.5 text-border">·</span>
        {t("footer.freeTrial")}
      </p>
    </footer>
  );
}
