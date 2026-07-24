import Link from "next/link";
import { BRAND_NAME, BRAND_SLOGAN } from "@/lib/brand";

type BrandMarkProps = {
  /** 是否带 slogan；顶栏窄处可关掉 */
  showSlogan?: boolean;
  /** 是否可点回首页 */
  href?: string | false;
  className?: string;
  nameClassName?: string;
  sloganClassName?: string;
};

/** 前端主 logo：Packflow + 可选 slogan */
export default function BrandMark({
  showSlogan = true,
  href = "/",
  className = "",
  nameClassName = "",
  sloganClassName = "",
}: BrandMarkProps) {
  const inner = (
    <span className={`inline-flex min-w-0 flex-col ${className}`}>
      <span
        className={`font-semibold tracking-tight text-zinc-900 ${nameClassName}`}
      >
        {BRAND_NAME}
      </span>
      {showSlogan ? (
        <span
          className={`mt-0.5 max-w-[16rem] text-[10px] leading-snug font-normal text-zinc-500 ${sloganClassName}`}
        >
          {BRAND_SLOGAN}
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="min-w-0 hover:opacity-90">
      {inner}
    </Link>
  );
}
