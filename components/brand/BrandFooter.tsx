import { BRAND_SITE, BRAND_SITE_URL, BRAND_SLOGAN } from "@/lib/brand";

type BrandFooterProps = {
  className?: string;
};

/** 首页底部：官网 + slogan（全站宣传语只在这里出现一次） */
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
        className="text-xs font-medium tracking-wide text-slate-600 hover:text-slate-900"
      >
        {BRAND_SITE}
      </a>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">
        {BRAND_SLOGAN}
      </p>
    </footer>
  );
}
