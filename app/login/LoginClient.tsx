"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type Mode = "login" | "register";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "邮箱或密码不对，请再试一次。";
  }
  if (
    m.includes("user already registered") ||
    m.includes("already been registered")
  ) {
    return "这个邮箱已经注册过了，请直接登录。";
  }
  if (m.includes("password") && m.includes("6")) {
    return "密码至少要 6 位。";
  }
  if (m.includes("email")) {
    return "请检查邮箱格式是否正确。";
  }
  return message || "操作失败，请稍后重试。";
}

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/projects";
  const urlError = search.get("error");

  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [mode, setMode] = useState<Mode>("login");
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
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
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
          登录后，以后可以把工艺包存到网上，换电脑也能打开。
          <br />
          <strong className="font-medium text-zinc-700">
            现在还没同步功能
          </strong>
          ，未登录也能照常在本机做款。
        </p>

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
            {busy ? "请稍候…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-400">
          <Link href="/" className="text-blue-600 hover:underline">
            先回首页继续本机使用
          </Link>
        </p>
      </main>
    </div>
  );
}
