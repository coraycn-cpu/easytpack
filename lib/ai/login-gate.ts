/**
 * AI 登录门槛：未登录不可调 AI；可手动标注，存档/同步需登录。
 */

export const AI_LOGIN_REQUIRED_CODE = "AI_LOGIN_REQUIRED";

export const AI_LOGIN_REQUIRED_MESSAGE =
  "使用 AI 需要先注册或登录。你仍可在画布上手动标注；登录后才能调用 AI，并把稿同步存到云端。";

export const CLOUD_SAVE_LOGIN_MESSAGE =
  "把稿存到云端需要先注册或登录。本机浏览器里仍会自动保存，可继续手动标注。";

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
  if (mode === "register") qs.set("mode", "register");
  qs.set("next", next);
  return `/login?${qs.toString()}`;
}
