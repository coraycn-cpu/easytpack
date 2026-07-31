"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "首页", match: (p: string) => p === "/" },
  {
    href: "/projects",
    label: "项目库",
    match: (p: string) => p.startsWith("/projects"),
  },
  {
    href: "/templates",
    label: "模板",
    match: (p: string) => p.startsWith("/templates"),
    soon: true,
  },
  {
    href: "/account",
    label: "设置",
    match: (p: string) => p.startsWith("/account"),
  },
] as const;

/**
 * 项目库 / 用户中心左侧导航壳（对照 Dashboard 参考图，仅导航已有页面）
 */
export default function AppSideNav() {
  const pathname = usePathname() || "/";

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-background md:flex">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const soon = "soon" in item && item.soon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand text-white"
                  : soon
                    ? "text-muted hover:bg-brand-soft hover:text-brand"
                    : "text-foreground hover:bg-brand-soft hover:text-brand"
              }`}
            >
              {item.label}
              {soon ? (
                <span className="ml-1 text-[10px] font-normal opacity-70">
                  即将
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-[var(--radius-sm)] border border-brand-light bg-brand-soft px-3 py-3 text-[11px] leading-relaxed text-brand-dark">
        <p className="font-semibold">需要帮助？</p>
        <p className="mt-1 text-muted">
          先上传正面图 → 手动标注 → 需要 AI 时再注册领额度。
        </p>
        <Link href="/" className="pf-btn-text mt-2 text-[11px] font-semibold">
          查看快速开始 →
        </Link>
      </div>
    </aside>
  );
}
