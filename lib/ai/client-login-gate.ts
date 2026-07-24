"use client";

import { isLoggedInForCloud } from "@/lib/project/cloud-sync";
import {
  AI_LOGIN_REQUIRED_CODE,
  AI_LOGIN_REQUIRED_MESSAGE,
  CLOUD_SAVE_LOGIN_MESSAGE,
  FREE_MONTHLY_AI_GIFT,
  REGISTER_CTA_LABEL,
  STUDIO_GUEST_BAR_TEXT,
  buildLoginHref,
} from "@/lib/ai/login-gate";

export {
  AI_LOGIN_REQUIRED_CODE,
  AI_LOGIN_REQUIRED_MESSAGE,
  CLOUD_SAVE_LOGIN_MESSAGE,
  FREE_MONTHLY_AI_GIFT,
  REGISTER_CTA_LABEL,
  STUDIO_GUEST_BAR_TEXT,
  buildLoginHref,
};

export function isAiLoginRequiredPayload(
  payload: unknown,
): boolean {
  if (!payload || typeof payload !== "object") return false;
  const code = (payload as { code?: unknown }).code;
  return code === AI_LOGIN_REQUIRED_CODE;
}

/** 把 AI 接口错误转成可读文案（含未登录引导） */
export function messageFromAiResponse(
  payload: unknown,
  fallback = "请求失败",
): string {
  if (isAiLoginRequiredPayload(payload)) {
    return AI_LOGIN_REQUIRED_MESSAGE;
  }
  if (payload && typeof payload === "object") {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

/**
 * 未登录则返回 false（调用方应提示并跳转登录/注册）。
 * 已登录返回 true。
 */
export async function ensureLoggedInForAi(): Promise<boolean> {
  return isLoggedInForCloud();
}

export type AiLoginGateResult =
  | { ok: true }
  | { ok: false; message: string; href: string };

/** 检查登录；未登录时给出文案与跳转地址（默认引导注册） */
export async function gateAiLogin(opts?: {
  next?: string;
}): Promise<AiLoginGateResult> {
  if (await isLoggedInForCloud()) return { ok: true };
  return {
    ok: false,
    message: AI_LOGIN_REQUIRED_MESSAGE,
    href: buildLoginHref({ next: opts?.next, mode: "register" }),
  };
}

export async function gateCloudSaveLogin(opts?: {
  next?: string;
}): Promise<AiLoginGateResult> {
  if (await isLoggedInForCloud()) return { ok: true };
  return {
    ok: false,
    message: CLOUD_SAVE_LOGIN_MESSAGE,
    href: buildLoginHref({ next: opts?.next, mode: "register" }),
  };
}
