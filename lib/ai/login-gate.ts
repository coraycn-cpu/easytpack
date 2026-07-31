/**
 * 未登录门槛 + 注册引导文案（统一口径，避免各处说法不一致）
 */

export const AI_LOGIN_REQUIRED_CODE = "AI_LOGIN_REQUIRED";

/** 默认免费档；可被环境变量覆盖（见 freeMonthlyAiGift） */
export const DEFAULT_FREE_MONTHLY_AI_UNITS = 200;

/**
 * 营销/界面展示用的「每月免费点数」。
 * 优先读 NEXT_PUBLIC_AI_FREE_MONTHLY_UNITS（与 Vercel 里 AI_FREE_MONTHLY_UNITS 保持同值）。
 */
export function freeMonthlyAiGift(): number {
  const raw =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_AI_FREE_MONTHLY_UNITS ||
        process.env.AI_FREE_MONTHLY_UNITS)) ||
    "";
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return DEFAULT_FREE_MONTHLY_AI_UNITS;
}

/** @deprecated 请优先用 freeMonthlyAiGift()；保留常量兼容旧引用（构建期内联公共变量） */
export const FREE_MONTHLY_AI_GIFT = freeMonthlyAiGift();

export const REGISTER_CTA_LABEL = "免费注册 · 领 AI 额度";

export const LOGIN_CTA_LABEL = "已有账号？登录";

export const AI_LOGIN_REQUIRED_MESSAGE =
  `使用 AI 需要先注册。现在注册即送每月 ${FREE_MONTHLY_AI_GIFT} 点 AI 额度，还能把稿存到云端、换设备继续。你仍可先在画布上手动标注。`;

export const CLOUD_SAVE_LOGIN_MESSAGE =
  `把稿存到云端需要先注册。注册免费，并送每月 ${FREE_MONTHLY_AI_GIFT} 点 AI 额度；本机浏览器里仍会自动保存，可继续手动标注。`;

export const GUEST_MANUAL_OK_TIP =
  "未登录也能手动标注（方框 / 尺寸线 / 工艺表）。本机浏览器会自动保存。";

export const REGISTER_BENEFITS_HEADLINE = `注册免费，每月送 ${FREE_MONTHLY_AI_GIFT} 点 AI`;

export const REGISTER_BENEFITS_LINES = [
  `每月 ${FREE_MONTHLY_AI_GIFT} 点 AI：一键标注、生图、补全都可用（生图成功一次约 5 点）`,
  "云端存档：换电脑 / 换浏览器也能打开旧款",
  "邀请好友双方再各得 50 分（加进每月 AI 上限）",
] as const;

export const GUEST_LIMIT_LINES = [
  "未登录不能调用 AI",
  "未登录不能同步到云端（稿只在本机浏览器）",
] as const;

/** 画布顶栏旁短提示（并入顶栏，不再单独占一行） */
export const STUDIO_GUEST_BAR_TEXT =
  `可手动标注，本机已自动保存。注册送每月 ${FREE_MONTHLY_AI_GIFT} 点 AI + 云端存档。`;

export function buildLoginHref(opts?: {
  next?: string;
  /** 默认引导注册 */
  mode?: "login" | "register";
}): string {
  const mode = opts?.mode ?? "register";
  const next =
    opts?.next ??
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");
  const qs = new URLSearchParams();
  qs.set("mode", mode);
  qs.set("next", next);
  // 进站页已合并登录/注册；旧 /login 仍会重定向到这里
  return `/?${qs.toString()}`;
}
