"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  captureInviteRefFromSearch,
} from "@/lib/invite/claim-pending";
import { startPostAuthBackgroundWork } from "@/lib/auth/post-auth-bootstrap";
import {
  FREE_MONTHLY_AI_GIFT,
  REGISTER_CTA_LABEL,
} from "@/lib/ai/login-gate";

type Mode = "login" | "register";

function friendlyAuthError(message: string): string {
  const raw = (message || "").trim();
  const m = raw.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "邮箱或密码不对，请再试一次。";
  }
  if (
    m.includes("user already registered") ||
    m.includes("already been registered") ||
    m.includes("already registered")
  ) {
    return "这个邮箱已经注册过了，请点上方「登录」。";
  }
  if (
    m.includes("password should be at least") ||
    m.includes("password is known to be weak") ||
    (m.includes("password") && m.includes("at least 6"))
  ) {
    return "密码至少要 6 位，请换一个更长一点的。";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "操作太频繁了，请等一两分钟再试。";
  }
  if (
    m.includes("confirm") ||
    m.includes("confirmation") ||
    m.includes("verify") ||
    m.includes("error sending") ||
    m.includes("smtp")
  ) {
    return "注册卡住了：多半是「要先验证邮箱」。请到云端后台 Authentication → Providers → Email，关掉 Confirm email 后再试。";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "云端暂时关闭了注册，请到 Authentication → Providers → Email 打开注册。";
  }
  // 只有明确说格式无效时，才提示邮箱格式
  if (
    m.includes("invalid format") ||
    m.includes("unable to validate email") ||
    m.includes("email address") && m.includes("invalid")
  ) {
    return "邮箱格式不对，请写成 名字@网站.com 这种。";
  }

  // 其它错误：白话 + 原文，方便排查
  return raw
    ? `注册/登录失败：${raw}`
    : "操作失败，请稍后重试。";
}

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/";
  const urlError = search.get("error");
  const urlMode = search.get("mode");
  const inviteRef = search.get("ref");

  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [mode, setMode] = useState<Mode>(
    urlMode === "register" || Boolean(inviteRef) ? "register" : "login",
  );

  useEffect(() => {
    captureInviteRefFromSearch(inviteRef);
  }, [inviteRef]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    urlError === "confirm"
      ? "邮箱确认出了问题，请再试一次注册或登录。"
      : null,
  );
  const [okTip, setOkTip] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setOkTip(null);

    if (!configured) {
      setMessage(
        "还没配置云端。请先按「云端账号准备」说明填好钥匙再来。",
      );
      return;
    }

    const trimmed = email.trim();
    if (!trimmed || !password) {
      setMessage("请填写邮箱和密码。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
        // 先进入产品；邀请领取 + 云端同步放后台，避免登录按钮卡很久
        startPostAuthBackgroundWork({ user: data.user });
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;

      if (data.session) {
        startPostAuthBackgroundWork({ user: data.user });
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setOkTip(
        "注册成功。若网站要求验证邮箱，请去邮箱点确认链接；测试时可在云端后台关掉「确认邮箱」。",
      );
      setMode("login");
    } catch (err) {
      setMessage(
        friendlyAuthError(err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {mode === "login" ? "登录账号" : "注册账号"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {mode === "register" ? (
            <>
              注册免费。每月送{" "}
              <strong className="font-semibold text-zinc-800">
                {FREE_MONTHLY_AI_GIFT} 点 AI
              </strong>
              额度（一键标注、生图、补全），还能把工艺包存到云端、换设备继续。
              <br />
              未登录也可先手动标注；要用 AI 或云端存档再来注册即可。
            </>
          ) : (
            <>
              登录后可继续使用你的 AI 额度与云端稿件，换电脑也能打开。
              <br />
              还没有账号？切换到「注册」，免费领每月 {FREE_MONTHLY_AI_GIFT}{" "}
              点 AI。
            </>
          )}
        </p>
        {mode === "register" && !inviteRef ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-950">
            <li>✓ 每月 {FREE_MONTHLY_AI_GIFT} 点 AI 调用额度</li>
            <li>✓ 云端存档，换设备不丢稿</li>
            <li>✓ 邀请好友双方再各得 50 分</li>
          </ul>
        ) : null}
        {inviteRef ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            你正在通过好友邀请注册。注册成功后，双方各得 50
            积分（邀请人最多可成功邀请 6 人，上限 300 分）。
          </p>
        ) : null}

        {!configured && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            还没配好云端钥匙。请打开说明{" "}
            <code className="rounded bg-amber-100 px-1">
              docs/SUPABASE_SETUP.md
            </code>
            ，在 <strong>Vercel → Settings → Environment Variables</strong>{" "}
            填好两把钥匙后重新部署。
          </div>
        )}

        <div className="mt-6 flex gap-2 rounded-lg border border-zinc-200 bg-white p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
              setOkTip(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm ${
              mode === "login"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage(null);
              setOkTip(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm ${
              mode === "register"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            注册
          </button>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              邮箱
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              密码（至少 6 位）
            </label>
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="••••••••"
            />
          </div>

          {message && <p className="text-xs text-red-600">{message}</p>}
          {okTip && <p className="text-xs text-emerald-700">{okTip}</p>}

          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy
              ? "请稍候…"
              : mode === "login"
                ? "登录"
                : REGISTER_CTA_LABEL}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-400">
          <Link href="/" className="text-blue-600 hover:underline">
          先回首页继续手动标注
        </Link>
        </p>
      </main>
    </div>
  );
}
