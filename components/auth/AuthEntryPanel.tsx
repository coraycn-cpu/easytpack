"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
import BusyOverlay from "@/components/ui/BusyOverlay";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { captureInviteRefFromSearch } from "@/lib/invite/claim-pending";
import { startPostAuthBackgroundWork } from "@/lib/auth/post-auth-bootstrap";
import { FREE_MONTHLY_AI_GIFT } from "@/lib/ai/login-gate";
import {
  INVITE_MAX_SUCCESS,
  INVITE_POINTS_CAP,
  INVITE_REWARD_POINTS,
} from "@/lib/invite/constants";
import type { TranslateFn } from "@/lib/i18n/translate";

type Mode = "login" | "register" | "forgot";

function friendlyAuthError(message: string, t: TranslateFn): string {
  const raw = (message || "").trim();
  const m = raw.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return t("auth.errBadCreds");
  }
  if (
    m.includes("user already registered") ||
    m.includes("already been registered") ||
    m.includes("already registered")
  ) {
    return t("auth.errExists");
  }
  if (
    m.includes("password should be at least") ||
    m.includes("password is known to be weak") ||
    (m.includes("password") && m.includes("at least 6"))
  ) {
    return t("auth.errWeakPass");
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return t("auth.errRate");
  }
  if (
    m.includes("confirm") ||
    m.includes("confirmation") ||
    m.includes("verify") ||
    m.includes("error sending") ||
    m.includes("smtp")
  ) {
    return t("auth.errConfirm");
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return t("auth.errSignupOff");
  }
  if (
    m.includes("invalid format") ||
    m.includes("unable to validate email") ||
    (m.includes("email address") && m.includes("invalid"))
  ) {
    return t("auth.errEmail");
  }

  return raw ? t("auth.errPrefix", { msg: raw }) : t("auth.errGeneric");
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
  const { t } = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || defaultNext;
  const urlError = search.get("error");
  const urlMode = search.get("mode");
  const inviteRef = search.get("ref");

  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [mode, setMode] = useState<Mode>(
    urlMode === "register" || Boolean(inviteRef)
      ? "register"
      : urlMode === "forgot"
        ? "forgot"
        : "login",
  );

  useEffect(() => {
    captureInviteRefFromSearch(inviteRef);
  }, [inviteRef]);

  useEffect(() => {
    if (urlMode === "register" || urlMode === "login" || urlMode === "forgot") {
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
      ? t("auth.errUrlConfirm")
      : null,
  );
  const [okTip, setOkTip] = useState<string | null>(null);

  const showBusy = busy || entering;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setOkTip(null);

    if (!configured) {
      setMessage(t("auth.cloudNotReady"));
      return;
    }

    const trimmed = email.trim();
    if (!trimmed) {
      setMessage(t("auth.errEmailRequired"));
      return;
    }
    if (mode !== "forgot" && !password) {
      setMessage(t("auth.errCredentialsRequired"));
      return;
    }

    setBusy(true);
    let willEnter = false;
    try {
      const supabase = createClient();
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account?reset=1")}`,
        });
        if (error) throw error;
        setOkTip(t("auth.resetSent"));
        return;
      }
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

      setOkTip(t("auth.signupSuccess"));
      setMode("login");
    } catch (err) {
      setMessage(
        friendlyAuthError(
          err instanceof Error ? err.message : String(err),
          t,
        ),
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
                ? t("auth.busyRegisterSuccess")
                : t("auth.busyLoginSuccess")
              : mode === "register"
                ? t("auth.busyRegister")
                : mode === "forgot"
                  ? t("auth.submittingForgot")
                  : t("auth.busyLogin")
          }
          subtitle={
            entering
              ? t("auth.busyEnteringHint")
              : t("auth.busyConnectingHint")
          }
        />
      )}

      <div className="mb-4 flex justify-end">
        <LocaleSwitcher size="md" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">
        {mode === "login"
          ? t("auth.welcomeBack")
          : mode === "forgot"
            ? t("auth.forgot")
            : t("auth.createAccount")}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {mode === "login"
          ? t("auth.loginSubtitle", { brand: t("common.brandName") })
          : mode === "forgot"
            ? t("auth.forgotSubtitle")
            : t("auth.registerSubtitle", { n: FREE_MONTHLY_AI_GIFT })}
      </p>

      {mode === "register" && !inviteRef ? (
        <ul className="mt-4 space-y-1 rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-950">
          <li>✓ {t("auth.benefitQuota", { n: FREE_MONTHLY_AI_GIFT })}</li>
          <li>✓ {t("auth.benefitCloud")}</li>
          <li>✓ {t("auth.benefitInvite", { n: INVITE_REWARD_POINTS })}</li>
        </ul>
      ) : null}
      {inviteRef ? (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {t("auth.inviteBanner", {
            reward: INVITE_REWARD_POINTS,
            max: INVITE_MAX_SUCCESS,
            cap: INVITE_POINTS_CAP,
          })}
        </p>
      ) : null}

      {!configured && (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("auth.cloudNotReady")}
        </div>
      )}

      {mode !== "forgot" ? (
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
          {t("common.login")}
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
          {t("common.register")}
        </button>
      </div>
      ) : (
        <button
          type="button"
          disabled={showBusy}
          onClick={() => {
            setMode("login");
            setMessage(null);
            setOkTip(null);
          }}
          className="pf-btn-text mt-5 text-sm"
        >
          ← {t("auth.backToLogin")}
        </button>
      )}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className={`mt-5 space-y-4 ${
          showBusy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("auth.email")}
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
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>
        </div>
        {mode !== "forgot" ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-foreground">
              {mode === "register" ? t("auth.passwordMin") : t("auth.password")}
            </label>
            {mode === "login" ? (
              <button
                type="button"
                disabled={showBusy}
                onClick={() => {
                  setMode("forgot");
                  setMessage(null);
                  setOkTip(null);
                }}
                className="pf-btn-text text-xs"
              >
                {t("auth.switchToForgot")}
              </button>
            ) : null}
          </div>
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
              placeholder={t("auth.passwordPlaceholder")}
            />
            <button
              type="button"
              tabIndex={-1}
              disabled={showBusy}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center px-1.5 text-muted hover:text-foreground disabled:opacity-50"
              aria-label={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
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
        ) : null}

        {message && <p className="text-xs text-danger">{message}</p>}
        {okTip && <p className="text-xs text-emerald-700">{okTip}</p>}

        <button
          type="submit"
          disabled={showBusy || !configured}
          className="pf-btn-primary w-full py-2.5 text-sm"
        >
          {showBusy
            ? entering
              ? t("auth.entering")
              : mode === "forgot"
                ? t("auth.submittingForgot")
                : mode === "login"
                  ? t("auth.submittingLogin")
                  : t("auth.submittingRegister")
            : mode === "forgot"
              ? t("auth.submitForgot")
              : mode === "login"
                ? t("auth.submitLogin")
                : t("auth.submitRegister")}
        </button>
      </form>

      {mode !== "forgot" ? (
      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {t("common.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      ) : null}

      {mode !== "forgot" ? (
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? (
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
            {t("auth.switchToRegister")}
          </button>
        ) : (
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
            {t("auth.switchToLogin")}
          </button>
        )}
      </p>
      ) : null}
    </div>
  );
}
