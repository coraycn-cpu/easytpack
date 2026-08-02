"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { useLocale } from "@/components/i18n/LocaleProvider";
import SyncPreferenceControls from "@/components/account/SyncPreferenceControls";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  aiMeterActionLabel,
} from "@/lib/ai/metering";
import { getCloudSyncMode } from "@/lib/project/sync-preference";
import { consumeInviteClaimTip } from "@/lib/invite/claim-pending";
import { INVITE_REWARD_POINTS } from "@/lib/invite/constants";

type AiUsageItem = {
  id: string;
  action: string;
  units: number;
  ok: boolean;
  provider: string | null;
  model: string | null;
  projectId: string | null;
  createdAt: string;
};

type CloudUsagePage = {
  used: number;
  limit: number;
  base?: number;
  bonus?: number;
  inviteBonus?: number;
  adminBonus?: number;
  plan?: string;
  paused?: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: AiUsageItem[];
};

type InviteProfile = {
  inviteCode: string;
  points: number;
  inviteSuccessCount: number;
  inviteRemaining: number;
  rewardPoints: number;
  maxSuccess: number;
  pointsCap: number;
};

const PAGE_SIZE = 10;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="pf-card px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function AccountLoading() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
      {t("account.loading")}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useLocale();
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [usageLoading, setUsageLoading] = useState(false);
  const [cloudUsage, setCloudUsage] = useState<CloudUsagePage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminHint, setAdminHint] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<"auto" | "manual">("auto");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const showResetHint = search.get("reset") === "1";

  useEffect(() => {
    const tip = consumeInviteClaimTip();
    if (tip) setTip(tip);
    if (showResetHint) {
      setTip(t("account.setPasswordTip"));
    }
  }, [showResetHint, t]);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/?mode=login&next=/account");
        return;
      }
      setEmail(data.user.email ?? null);
      setReady(true);
    });
  }, [configured, router]);

  useEffect(() => {
    setSyncMode(getCloudSyncMode());
  }, [ready]);

  const loadUsage = useCallback(async (nextPage: number) => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await fetch(
        `/api/account/usage?page=${nextPage}&pageSize=${PAGE_SIZE}`,
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error || t("account.usageFail"));
      }
      const data = (await res.json()) as CloudUsagePage;
      setCloudUsage(data);
      setPage(data.page);
    } catch (e) {
      setUsageError(e instanceof Error ? e.message : t("account.usageFail"));
    } finally {
      setUsageLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!ready || !email || !configured) return;
    void loadUsage(1);
  }, [ready, email, configured, loadUsage]);

  const loadInvite = useCallback(async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/account/profile");
      const json = (await res.json().catch(() => null)) as
        | (InviteProfile & { error?: string })
        | null;
      if (!res.ok) {
        throw new Error(json?.error || t("account.inviteFail"));
      }
      if (!json?.inviteCode) throw new Error(t("account.noInviteCode"));
      setInvite({
        inviteCode: json.inviteCode,
        points: json.points,
        inviteSuccessCount: json.inviteSuccessCount,
        inviteRemaining: json.inviteRemaining,
        rewardPoints: json.rewardPoints,
        maxSuccess: json.maxSuccess,
        pointsCap: json.pointsCap,
      });
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : t("account.inviteFail"));
    } finally {
      setInviteLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!ready || !email || !configured) return;
    void loadInvite();
    void fetch("/api/admin/me")
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          isAdmin?: boolean;
          hint?: string | null;
        } | null;
        setIsAdmin(Boolean(json?.isAdmin));
        setAdminHint(json?.hint ?? null);
      })
      .catch(() => {
        setIsAdmin(false);
        setAdminHint(null);
      });
  }, [ready, email, configured, loadInvite]);

  const copyInviteLink = async () => {
    if (!invite?.inviteCode) return;
    const { buildInviteRegisterUrl } = await import("@/lib/invite/constants");
    const url = buildInviteRegisterUrl(invite.inviteCode);
    try {
      await navigator.clipboard.writeText(url);
      setTip(t("account.inviteCopied"));
    } catch {
      setTip(t("account.copyManual", { url }));
    }
  };

  const handleSignOut = async () => {
    if (!configured || busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!configured || passwordBusy) return;
    const pwd = newPassword.trim();
    if (pwd.length < 6) {
      setTip(t("auth.errWeakPass"));
      return;
    }
    setPasswordBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setNewPassword("");
      setTip(t("account.passwordSaved"));
    } catch (e) {
      setTip(e instanceof Error ? e.message : t("auth.errGeneric"));
    } finally {
      setPasswordBusy(false);
    }
  };

  if (!ready) {
    return <AccountLoading />;
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-2xl font-bold text-foreground">
            {t("account.title")}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {t("account.localModeTip")}
          </p>
          <Link href="/projects" className="mt-6 inline-block text-sm text-brand">
            ← {t("account.myProjects")}
          </Link>
        </main>
      </div>
    );
  }

  const totalPages = cloudUsage?.totalPages ?? 1;
  const items = cloudUsage?.items ?? [];
  const usagePct =
    cloudUsage && cloudUsage.limit > 0
      ? Math.min(100, Math.round((cloudUsage.used / cloudUsage.limit) * 100))
      : 0;

  const planLabel =
    cloudUsage?.plan === "paused"
      ? t("account.paused")
      : cloudUsage?.plan === "comped"
        ? t("account.comped")
        : t("account.freePlan");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">
              {t("account.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {email ?? t("account.signedIn")} · {planLabel} ·{" "}
              {t("account.sync")}{" "}
              {syncMode === "auto"
                ? t("account.syncAuto")
                : t("account.syncManual")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/projects"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-background"
            >
              {t("account.myProjects")}
            </Link>
            <Link
              href="/"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-background"
            >
              {t("account.backHome")}
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-md border bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
              >
                {t("account.admin")}
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignOut()}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-background disabled:opacity-50"
            >
              {busy ? t("account.signingOut") : t("common.logout")}
            </button>
          </div>
        </div>

        {tip ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {tip}
          </p>
        ) : null}
        {adminHint && isAdmin ? (
          <p className="mb-4 text-xs text-amber-700">{adminHint}</p>
        ) : null}

        <section className="pf-card mb-5 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("account.password")}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {t("account.forgotHint")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("account.newPasswordPh")}
              className="pf-input max-w-xs px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={passwordBusy || newPassword.trim().length < 6}
              onClick={() => void handleUpdatePassword()}
              className="pf-btn-primary px-3 py-2 text-xs disabled:opacity-40"
            >
              {passwordBusy
                ? t("account.savingPassword")
                : t("account.savePassword")}
            </button>
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              {t("account.overview")}
            </p>
            <button
              type="button"
              disabled={usageLoading || inviteLoading}
              onClick={() => {
                void loadUsage(page);
                void loadInvite();
              }}
              className="text-[11px] text-brand hover:underline disabled:opacity-40"
            >
              {usageLoading || inviteLoading
                ? t("account.refreshing")
                : t("account.refresh")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={t("account.aiUsed")}
              value={
                cloudUsage?.paused
                  ? t("account.paused")
                  : cloudUsage
                    ? `${cloudUsage.used}/${cloudUsage.limit}`
                    : usageLoading
                      ? "…"
                      : "—"
              }
              hint={
                cloudUsage
                  ? cloudUsage.paused
                    ? t("account.adminPaused")
                    : t("account.usageBreakdown", {
                        pct: usagePct,
                        base: cloudUsage.base ?? "—",
                        invite:
                          cloudUsage.inviteBonus ?? cloudUsage.bonus ?? 0,
                        admin: cloudUsage.adminBonus ?? 0,
                      })
                  : t("account.cloudQuota")
              }
            />
            <StatTile
              label={t("account.invitePoints")}
              value={
                invite
                  ? `${invite.points}/${invite.pointsCap}`
                  : inviteLoading
                    ? "…"
                    : "—"
              }
              hint={`${t("account.inviteBoth")} · ${t("account.countsToward")}`}
            />
            <StatTile
              label={t("account.successInvites")}
              value={
                invite
                  ? `${invite.inviteSuccessCount}/${invite.maxSuccess}`
                  : inviteLoading
                    ? "…"
                    : "—"
              }
              hint={
                invite
                  ? invite.inviteRemaining > 0
                    ? t("account.inviteMore", { n: invite.inviteRemaining })
                    : t("account.inviteFull")
                  : t("account.inviteHint")
              }
            />
            <StatTile
              label={t("account.pricing")}
              value={t("account.genCost")}
              hint={t("account.pricingHint")}
            />
          </div>
          {cloudUsage ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          ) : null}
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {t("account.quotaTitle", {
              used: cloudUsage?.used ?? "—",
              limit: cloudUsage?.limit ?? "—",
            })}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <section className="pf-card px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("account.sync")}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {syncMode === "auto"
                  ? t("projects.syncAutoHint")
                  : t("projects.syncManualHint")}
              </p>
              <div className="mt-3">
                <SyncPreferenceControls
                  onChanged={(m, msg) => {
                    setSyncMode(m);
                    setTip(msg);
                  }}
                />
              </div>
              <Link
                href="/projects"
                className="mt-3 inline-block text-[11px] text-brand hover:underline"
              >
                {t("account.myProjects")} →
              </Link>
            </section>

            <section className="pf-card px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("account.invite")}
                </p>
                <button
                  type="button"
                  disabled={inviteLoading}
                  onClick={() => void loadInvite()}
                  className="text-[11px] text-brand hover:underline disabled:opacity-40"
                >
                  {inviteLoading ? "…" : t("account.refresh")}
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {t("guest.benefit4", {
                  reward: invite?.rewardPoints ?? INVITE_REWARD_POINTS,
                  cap: invite?.pointsCap ?? 300,
                })}
              </p>
              {inviteError ? (
                <p className="mt-2 text-[11px] text-amber-700">{inviteError}</p>
              ) : null}
              {invite ? (
                <div className="mt-3 space-y-2 text-[11px] text-foreground">
                  <p className="break-all text-muted">
                    <code className="rounded bg-background px-1 text-foreground">
                      {invite.inviteCode}
                    </code>
                  </p>
                  <button
                    type="button"
                    disabled={invite.inviteRemaining <= 0}
                    onClick={() => void copyInviteLink()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("account.copyInvite")}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted">
                  {inviteLoading
                    ? t("account.inviteLoading")
                    : t("account.cannotRead")}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-dashed border-border bg-white px-4 py-4">
              <p className="text-xs font-medium text-foreground">
                {t("account.team")}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                {t("account.teamSoonBody")}
              </p>
              <button
                type="button"
                disabled
                className="mt-3 cursor-not-allowed rounded-md border border-border bg-background px-3 py-1.5 text-[11px] text-muted"
              >
                {t("account.comingSoon")}
              </button>
            </section>
          </div>

          <section className="pf-card px-4 py-4 lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("account.usage")}
              </p>
              <button
                type="button"
                disabled={usageLoading}
                onClick={() => void loadUsage(page)}
                className="text-[11px] text-brand hover:underline disabled:opacity-40"
              >
                {usageLoading
                  ? t("account.refreshing")
                  : t("account.refresh")}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {t("account.quotaTitle", {
                used: cloudUsage?.used ?? 0,
                limit: cloudUsage?.limit ?? 0,
              })}
              {" · "}
              {cloudUsage?.total ?? 0}
            </p>
            {usageError ? (
              <p className="mt-2 text-[11px] text-amber-700">{usageError}</p>
            ) : null}

            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-muted">
                <span>{t("account.colFeature")}</span>
                <span>{t("account.colPoints")}</span>
                <span>{t("account.colTime")}</span>
              </div>
              {items.length === 0 ? (
                <p className="px-2.5 py-8 text-center text-[11px] text-muted">
                  {usageLoading
                    ? t("account.loadingDetail")
                    : t("account.noUsage")}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2.5 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {aiMeterActionLabel(item.action)}
                          {!item.ok ? (
                            <span className="ml-1 text-amber-600">
                              {t("account.failed")}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {[item.provider, item.model]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <span
                        className={`tabular-nums ${
                          item.ok ? "text-foreground" : "text-muted"
                        }`}
                      >
                        {item.ok ? `-${item.units}` : "0"}
                      </span>
                      <span className="tabular-nums text-muted">
                        {formatTime(item.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={usageLoading || page <= 1}
                onClick={() => void loadUsage(page - 1)}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("projects.prevPage")}
              </button>
              <span className="text-[11px] text-muted">
                {t("projects.pageInfo", {
                  n: cloudUsage?.total ?? 0,
                  page,
                  total: totalPages,
                })}
              </span>
              <button
                type="button"
                disabled={usageLoading || page >= totalPages}
                onClick={() => void loadUsage(page + 1)}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("projects.nextPage")}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
