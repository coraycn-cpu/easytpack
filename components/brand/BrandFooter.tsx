import {
  BRAND_CONTACT_EMAIL,
  BRAND_SITE,
  BRAND_SITE_URL,
  BRAND_SLOGAN,
} from "@/lib/brand";

type BrandFooterProps = {
  className?: string;
};

/** 首页底部：官网 + slogan + 业务联系（全站宣传语只在这里出现一次） */
export default function BrandFooter({ className = "" }: BrandFooterProps) {
  return (
    <footer
      className={`pointer-events-auto text-center ${className}`}
      aria-label="品牌信息"
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
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        业务联系：
        <a
          href={`mailto:${BRAND_CONTACT_EMAIL}`}
          className="font-medium text-brand hover:text-brand-dark"
        >
          {BRAND_CONTACT_EMAIL}
        </a>
        <span className="mx-1.5 text-border">·</span>
        注册可免费试用
      </p>
    </footer>
  );
}
