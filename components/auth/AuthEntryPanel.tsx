"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BusyOverlay from "@/components/ui/BusyOverlay";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { captureInviteRefFromSearch } from "@/lib/invite/claim-pending";
import { startPostAuthBackgroundWork } from "@/lib/auth/post-auth-bootstrap";
import {
  FREE_MONTHLY_AI_GIFT,
  REGISTER_CTA_LABEL,
} from "@/lib/ai/login-gate";
import { BRAND_NAME } from "@/lib/brand";

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
  if (
    m.includes("invalid format") ||
    m.includes("unable to validate email") ||
    (m.includes("email address") && m.includes("invalid"))
  ) {
    return "邮箱格式不对，请写成 名字@网站.com 这种。";
  }

  return raw ? `注册/登录失败：${raw}` : "操作失败，请稍后重试。";
}

type AuthEntryPanelProps = {
  /** 登录成功后的默认回跳（可被 URL ?next= 覆盖） */
  defaultNext?: string;
  className?: string;
};

/**
 * 登录/注册表单（业务逻辑与原登录页一致，仅嵌入用）
 */
export default function AuthEntryPanel({
  defaultNext = "/",
  className = "",
}: AuthEntryPanelProps) {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || defaultNext;
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

  useEffect(() => {
    if (urlMode === "register" || urlMode === "login") {
      setMode(urlMode);
    }
  }, [urlMode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const [message, setMessage] = useState<string | null>(
    urlError === "confirm"
      ? "邮箱确认出了问题，请再试一次注册或登录。"
      : null,
  );
  const [okTip, setOkTip] = useState<string | null>(null);

  const showBusy = busy || entering;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setOkTip(null);

    if (!configured) {
      setMessage("还没配置云端。请先按「云端账号准备」说明填好钥匙再来。");
      return;
    }

    const trimmed = email.trim();
    if (!trimmed || !password) {
      setMessage("请填写邮箱和密码。");
      return;
    }

    setBusy(true);
    let willEnter = false;
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
        willEnter = true;
        setEntering(true);
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
        willEnter = true;
        setEntering(true);
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
      setEntering(false);
    } finally {
      if (!willEnter) setBusy(false);
    }
  };

  return (
    <div className={className}>
      {showBusy && (
        <BusyOverlay
          title={
            entering
              ? mode === "register"
                ? "注册成功，正在进入…"
                : "登录成功，正在进入…"
              : mode === "register"
                ? "正在注册…"
                : "正在登录…"
          }
          subtitle={
            entering
              ? "请稍候，马上跳转到你刚才的页面"
              : "正在连接账号服务，请不要关闭或重复点击"
          }
        />
      )}

      <h2 className="text-2xl font-bold text-foreground">
        {mode === "login" ? "欢迎回来" : "创建账号"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {mode === "login"
          ? `登录后继续使用 ${BRAND_NAME}`
          : `注册免费，每月送 ${FREE_MONTHLY_AI_GIFT} 点 AI`}
      </p>

      {mode === "register" && !inviteRef ? (
        <ul className="mt-4 space-y-1 rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-950">
          <li>✓ 每月 {FREE_MONTHLY_AI_GIFT} 点 AI 调用额度</li>
          <li>✓ 云端存档，换设备不丢稿</li>
          <li>✓ 邀请好友双方再各得 50 分</li>
        </ul>
      ) : null}
      {inviteRef ? (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          你正在通过好友邀请注册。注册成功后，双方各得 50
          积分（邀请人最多可成功邀请 6 人，上限 300 分）。
        </p>
      ) : null}

      {!configured && (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          还没配好云端钥匙。请打开说明{" "}
          <code className="rounded bg-amber-100 px-1">
            docs/SUPABASE_SETUP.md
          </code>
          ，在 <strong>Vercel → Settings → Environment Variables</strong>{" "}
          填好两把钥匙后重新部署。
        </div>
      )}

      <div className="mt-5 flex gap-1 rounded-[var(--radius-sm)] border border-border bg-background p-1">
        <button
          type="button"
          disabled={showBusy}
          onClick={() => {
            setMode("login");
            setMessage(null);
            setOkTip(null);
          }}
          className={`flex-1 rounded-[var(--radius-sm)] py-2 text-sm font-medium disabled:opacity-50 ${
            mode === "login"
              ? "bg-brand text-white"
              : "text-muted hover:bg-white"
          }`}
        >
          登录
        </button>
        <button
          type="button"
          disabled={showBusy}
          onClick={() => {
            setMode("register");
            setMessage(null);
            setOkTip(null);
          }}
          className={`flex-1 rounded-[var(--radius-sm)] py-2 text-sm font-medium disabled:opacity-50 ${
            mode === "register"
              ? "bg-brand text-white"
              : "text-muted hover:bg-white"
          }`}
        >
          注册
        </button>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className={`mt-5 space-y-4 ${
          showBusy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            邮箱
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"
              aria-hidden
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M2 5.5A1.5 1.5 0 013.5 4h13A1.5 1.5 0 0118 5.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 14.5v-9zm1.5.3l6.1 4.07a.75.75 0 00.8 0L16.5 5.8V5.5a.25.25 0 00-.25-.25h-13a.25.25 0 00-.25.25v.3z" />
              </svg>
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={showBusy}
              className={`pf-input py-2.5 pl-9 pr-3 text-sm ${
                message ? "pf-input-error" : ""
              }`}
              placeholder="请输入邮箱"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            密码（至少 6 位）
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"
              aria-hidden
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V9a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={showBusy}
              className="pf-input py-2.5 pl-9 pr-10 text-sm"
              placeholder="请输入密码"
            />
            <button
              type="button"
              tabIndex={-1}
              disabled={showBusy}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center px-1.5 text-muted hover:text-foreground disabled:opacity-50"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path d="M2.28 2.22a.75.75 0 011.06 0l14.5 14.5a.75.75 0 11-1.06 1.06l-2.2-2.2A9.4 9.4 0 0110 16.5C5.5 16.5 2.1 13.4 1 10c.4-1.25 1.1-2.45 2.05-3.45L2.28 3.28a.75.75 0 010-1.06zM10 5.5c1.1 0 2.1.35 2.95.95L11.3 7.9A2.5 2.5 0 008.1 9.9L6.45 8.25A4.5 4.5 0 0110 5.5zm0 9c-3.4 0-6.05-2.1-7.2-4.5.5-1.05 1.35-2.1 2.45-2.9l1.55 1.55A4.5 4.5 0 0014.5 12l1.3 1.3A8.1 8.1 0 0110 14.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path d="M10 4c4.5 0 7.9 3.1 9 6.5-1.1 3.4-4.5 6.5-9 6.5S2.1 13.9 1 10.5C2.1 7.1 5.5 4 10 4zm0 2.5a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {message && <p className="text-xs text-danger">{message}</p>}
        {okTip && <p className="text-xs text-emerald-700">{okTip}</p>}

        <button
          type="submit"
          disabled={showBusy || !configured}
          className="pf-btn-primary w-full py-2.5 text-sm"
        >
          {showBusy
            ? entering
              ? "正在进入…"
              : mode === "login"
                ? "登录中…"
                : "注册中…"
            : mode === "login"
              ? "登录"
              : REGISTER_CTA_LABEL}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        或
        <span className="h-px flex-1 bg-border" />
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            还没有账号？{" "}
            <button
              type="button"
              disabled={showBusy}
              onClick={() => {
                setMode("register");
                setMessage(null);
                setOkTip(null);
              }}
              className="pf-btn-text font-semibold"
            >
              免费注册
            </button>
          </>
        ) : (
          <>
            已有账号？{" "}
            <button
              type="button"
              disabled={showBusy}
              onClick={() => {
                setMode("login");
                setMessage(null);
                setOkTip(null);
              }}
              className="pf-btn-text font-semibold"
            >
              去登录
            </button>
          </>
        )}
      </p>
    </div>
  );
}
