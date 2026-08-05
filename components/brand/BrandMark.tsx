import Link from "next/link";
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_SLOGAN } from "@/lib/brand";

type BrandMarkProps = {
  /**
   * 是否带 slogan。默认关掉：宣传语只在首页底部出现，避免重复。
   */
  showSlogan?: boolean;
  /** 是否可点回首页 */
  href?: string | false;
  /** 是否显示蓝色 P 图标（默认开） */
  showIcon?: boolean;
  /**
   * short：只显示 PackFlow（画布/顶栏）
   * full：显示产品全称（首页等）
   */
  variant?: "full" | "short";
  className?: string;
  nameClassName?: string;
  sloganClassName?: string;
  iconClassName?: string;
};

/** 蓝色 P 标：对照 UI 参考图，仅视觉 */
function BrandIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--brand)" />
      <path
        d="M11.2 23V9h6.1c3.15 0 5.15 1.7 5.15 4.45 0 2.75-2 4.45-5.15 4.45h-3.55V23H11.2zm2.55-7.35h3.4c1.7 0 2.7-.9 2.7-2.2s-1-2.2-2.7-2.2h-3.4v4.4z"
        fill="#fff"
      />
    </svg>
  );
}

/** 前端主 logo */
export default function BrandMark({
  showSlogan = false,
  href = "/",
  showIcon = true,
  variant = "full",
  className = "",
  nameClassName = "",
  sloganClassName = "",
  iconClassName = "h-7 w-7",
}: BrandMarkProps) {
  const label = variant === "short" ? BRAND_SHORT_NAME : BRAND_NAME;
  const inner = (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {showIcon ? <BrandIcon className={iconClassName} /> : null}
      <span className="inline-flex min-w-0 flex-col">
        <span
          className={`font-semibold tracking-tight text-zinc-900 ${
            variant === "full"
              ? "max-w-[14rem] text-left text-[13px] leading-snug sm:max-w-[18rem] sm:text-sm"
              : "text-sm leading-none"
          } ${nameClassName}`}
          title={BRAND_NAME}
        >
          {label}
        </span>
        {showSlogan ? (
          <span
            className={`mt-0.5 max-w-[16rem] text-[10px] leading-snug font-normal text-zinc-500 ${sloganClassName}`}
          >
            {BRAND_SLOGAN}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="min-w-0 hover:opacity-90">
      {inner}
    </Link>
  );
}
