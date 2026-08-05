"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  BRAND_CONTACT_EMAIL,
  BRAND_SITE,
  BRAND_SITE_URL,
  BRAND_SLOGAN,
} from "@/lib/brand";
import { ARTICLES_PATH } from "@/lib/content/articles/types";
import { GUIDE_PAGE_PATH } from "@/lib/content/guide-faq";

type BrandFooterProps = {
  className?: string;
  /** 说明页本身可关掉「功能介绍」自链 */
  showGuideLink?: boolean;
  /** 专题文章目录页可关掉自链 */
  showArticlesLink?: boolean;
};

/** 首页/说明页底部：官网 + slogan + 说明入口 + 业务联系 */
export default function BrandFooter({
  className = "",
  showGuideLink = true,
  showArticlesLink = true,
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
      {showGuideLink || showArticlesLink ? (
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
          {showGuideLink ? (
            <Link
              href={GUIDE_PAGE_PATH}
              className="font-medium text-brand hover:text-brand-dark"
            >
              {t("footer.guide")}
            </Link>
          ) : null}
          {showArticlesLink ? (
            <Link
              href={ARTICLES_PATH}
              className="font-medium text-brand hover:text-brand-dark"
            >
              {t("footer.articles")}
            </Link>
          ) : null}
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
