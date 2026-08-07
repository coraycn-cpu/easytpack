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

/**
 * PackFlow 蓝标：左箭头形 + 右 P，两块之间留缝。
 * 对照品牌附件；顶栏等浅底用透明底 SVG。
 */
function BrandIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <g fill="var(--brand, #3B82F6)">
        <path d="M29 9 L25.2 55 H18.2 V39.2 L8 32 L18.2 24.8 V9 Z" />
        <path
          fillRule="evenodd"
          d="M34.5 9 H43.5 C54 9 60 16.2 60 27.5 C60 38.8 54 46 43.5 46 H39.2 L37.6 55 H31.2 L34.5 9 Z M39.8 16.8 L38.6 38.2 H43 C49.6 38.2 53.2 33.6 53.2 27.5 C53.2 21.4 49.6 16.8 43 16.8 H39.8 Z"
        />
      </g>
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
