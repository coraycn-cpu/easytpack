"use client";

import Link from "next/link";
import {
  FREE_MONTHLY_AI_GIFT,
  GUEST_LIMIT_LINES,
  GUEST_MANUAL_OK_TIP,
  REGISTER_BENEFITS_HEADLINE,
  REGISTER_BENEFITS_LINES,
  REGISTER_CTA_LABEL,
  buildLoginHref,
} from "@/lib/ai/login-gate";

type GuestRegisterNudgeProps = {
  /** 登录后回跳 */
  next?: string;
  /** 紧凑条 / 完整卡片 */
  variant?: "card" | "banner" | "inline";
  className?: string;
};

/**
 * 未登录引导注册：限制说明 + 注册好处（含每月 AI 点数）
 */
export default function GuestRegisterNudge({
  next,
  variant = "card",
  className = "",
}: GuestRegisterNudgeProps) {
  const href = buildLoginHref({ mode: "register", next });

  if (variant === "banner") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-950 ${className}`}
      >
        <p className="min-w-0 leading-snug">
          {GUEST_MANUAL_OK_TIP}{" "}
          <span className="font-medium text-amber-900">
            注册送每月 {FREE_MONTHLY_AI_GIFT} 点 AI + 云端存档。
          </span>
        </p>
        <Link
          href={href}
          className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
        >
          {REGISTER_CTA_LABEL}
        </Link>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p className={`text-[10px] leading-relaxed text-slate-500 ${className}`}>
        {GUEST_MANUAL_OK_TIP} 注册即送每月{" "}
        <strong className="font-semibold text-slate-700">
          {FREE_MONTHLY_AI_GIFT} 点 AI
        </strong>
        ，还能云端存档。
        <Link href={href} className="ml-1 text-blue-600 hover:underline">
          {REGISTER_CTA_LABEL}
        </Link>
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-3.5 py-3 text-left ${className}`}
    >
      <p className="text-xs font-semibold text-amber-950">
        {REGISTER_BENEFITS_HEADLINE}
      </p>
      <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-amber-950/85">
        {REGISTER_BENEFITS_LINES.map((line) => (
          <li key={line} className="flex gap-1.5">
            <span className="shrink-0 text-emerald-600">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
        未登录限制：{GUEST_LIMIT_LINES.join("；")}。可先手动做款。
      </p>
      <Link
        href={href}
        className="mt-2.5 flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
      >
        {REGISTER_CTA_LABEL}
      </Link>
    </div>
  );
}
