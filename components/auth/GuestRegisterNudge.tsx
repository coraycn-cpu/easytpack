"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  FREE_MONTHLY_AI_GIFT,
  buildLoginHref,
} from "@/lib/ai/login-gate";
import {
  INVITE_POINTS_CAP,
  INVITE_REWARD_POINTS,
} from "@/lib/invite/constants";

type GuestRegisterNudgeProps = {
  /** 登录后回跳 */
  next?: string;
  /** 紧凑条 / 完整卡片 */
  variant?: "card" | "banner" | "inline";
  /** 卡片底部是否显示注册按钮（首页已有大按钮时可关） */
  showCta?: boolean;
  className?: string;
};

/**
 * 未登录引导注册：限制说明 + 注册好处（含每月 AI 点数）
 */
export default function GuestRegisterNudge({
  next,
  variant = "card",
  showCta = true,
  className = "",
}: GuestRegisterNudgeProps) {
  const { t, locale } = useLocale();
  const href = buildLoginHref({ mode: "register", next });
  const n = FREE_MONTHLY_AI_GIFT;
  const limitSep = locale === "en" ? "; " : "；";

  if (variant === "banner") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-950 ${className}`}
      >
        <p className="min-w-0 leading-snug">
          {t("guest.manualOk")}{" "}
          <span className="font-medium text-amber-900">
            {t("guest.registerGift", { n })}
          </span>
        </p>
        {showCta ? (
          <Link
            href={href}
            className="pf-btn-primary shrink-0 px-2.5 py-1 text-[11px]"
          >
            {t("guest.cta")}
          </Link>
        ) : null}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p className={`text-[10px] leading-relaxed text-slate-500 ${className}`}>
        {t("guest.manualOk")} {t("guest.registerInline", { n })}
        {showCta ? (
          <Link href={href} className="ml-1 text-blue-600 hover:underline">
            {t("guest.cta")}
          </Link>
        ) : null}
      </p>
    );
  }

  const benefitLines = [
    t("guest.benefit1", { n }),
    t("guest.benefit2", { n }),
    t("guest.benefit3"),
    t("guest.benefit4", {
      reward: INVITE_REWARD_POINTS,
      cap: INVITE_POINTS_CAP,
    }),
  ];

  return (
    <div
      className={`rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-3.5 py-3 text-left ${className}`}
    >
      <p className="text-xs font-semibold text-amber-950">
        {t("guest.headline", { n })}
      </p>
      <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-amber-950/85">
        {benefitLines.map((line) => (
          <li key={line} className="flex gap-1.5">
            <span className="shrink-0 text-emerald-600">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
        {t("guest.limits", {
          lines: [t("guest.limitAi"), t("guest.limitCloud")].join(limitSep),
        })}
      </p>
      {showCta ? (
        <Link
          href={href}
          className="pf-btn-primary mt-2.5 w-full py-2 text-xs"
        >
          {t("guest.cta")}
        </Link>
      ) : null}
    </div>
  );
}
