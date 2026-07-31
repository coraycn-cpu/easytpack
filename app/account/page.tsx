"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
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

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
          加载账号…
        </div>
      }
    >
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const router = useRouter();
  const search = useSearchParams();
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
      setTip("请在下方设置新密码（来自邮箱重置链接）。");
    }
  }, [showResetHint]);

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
        throw new Error(err?.error || "读取用量失败");
      }
      const data = (await res.json()) as CloudUsagePage;
      setCloudUsage(data);
      setPage(data.page);
    } catch (e) {
      setUsageError(e instanceof Error ? e.message : "读取用量失败");
    } finally {
      setUsageLoading(false);
    }
  }, []);

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
        throw new Error(json?.error || "读取邀请信息失败");
      }
      if (!json?.inviteCode) throw new Error("未返回邀请码");
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
      setInviteError(e instanceof Error ? e.message : "读取邀请信息失败");
    } finally {
      setInviteLoading(false);
    }
  }, []);

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
      setTip("邀请链接已复制，发给好友注册即可");
    } catch {
      setTip(`请手动复制：${url}`);
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
      setTip("新密码至少 6 位。");
      return;
    }
    setPasswordBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setNewPassword("");
      setTip("新密码已保存，以后请用新密码登录。");
    } catch (e) {
      setTip(e instanceof Error ? e.message : "改密失败，请稍后重试");
    } finally {
      setPasswordBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        加载账号…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-2xl font-bold text-foreground">用户中心</h1>
          <p className="mt-3 text-sm text-muted">
            当前是本机模式（未配置云端）。配置后可登录、同步项目与查看 AI 额度。
          </p>
          <Link href="/projects" className="mt-6 inline-block text-sm text-brand">
            ← 我的项目
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* 顶栏：身份 + 快捷入口 */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">用户中心</h1>
            <p className="mt-1 text-sm text-muted">
              {email ?? "已登录"} ·{" "}
              {cloudUsage?.plan === "paused"
                ? "已暂停"
                : cloudUsage?.plan === "comped"
                  ? "内部赠送"
                  : "个人版"}{" "}
              · 同步
              {syncMode === "auto" ? "自动" : "手动"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/projects"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-background"
            >
              我的项目
            </Link>
            <Link
              href="/"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-background"
            >
              回首页
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-md border bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
              >
                管理后台
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignOut()}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-background disabled:opacity-50"
            >
              {busy ? "退出中…" : "退出"}
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
            修改密码
          </p>
          <p className="mt-1 text-[11px] text-muted">
            忘记密码时：首页点「忘记密码」收邮件 → 点链接回到这里设置新密码。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 6 位）"
              className="pf-input max-w-xs px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={passwordBusy || newPassword.trim().length < 6}
              onClick={() => void handleUpdatePassword()}
              className="pf-btn-primary px-3 py-2 text-xs disabled:opacity-40"
            >
              {passwordBusy ? "保存中…" : "保存新密码"}
            </button>
          </div>
        </section>

        {/* 简易数据看板 */}
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">本月概览</p>
            <button
              type="button"
              disabled={usageLoading || inviteLoading}
              onClick={() => {
                void loadUsage(page);
                void loadInvite();
              }}
              className="text-[11px] text-brand hover:underline disabled:opacity-40"
            >
              {usageLoading || inviteLoading ? "刷新中…" : "刷新数据"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="AI 已用"
              value={
                cloudUsage?.paused
                  ? "已暂停"
                  : cloudUsage
                    ? `${cloudUsage.used}/${cloudUsage.limit}`
                    : usageLoading
                      ? "…"
                      : "—"
              }
              hint={
                cloudUsage
                  ? cloudUsage.paused
                    ? "管理员已暂停 AI"
                    : `已用 ${usagePct}% · 免费 ${cloudUsage.base ?? "—"} + 邀请 ${cloudUsage.inviteBonus ?? cloudUsage.bonus ?? 0} + 加赠 ${cloudUsage.adminBonus ?? 0}`
                  : "云端月额度"
              }
            />
            <StatTile
              label="邀请积分"
              value={
                invite
                  ? `${invite.points}/${invite.pointsCap}`
                  : inviteLoading
                    ? "…"
                    : "—"
              }
              hint="计入 AI 额度上限"
            />
            <StatTile
              label="成功邀请"
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
                    ? `还可邀 ${invite.inviteRemaining} 人`
                    : "名额已满"
                  : "双方各得积分"
              }
            />
            <StatTile
              label="计价说明"
              value="生图 5 点"
              hint="其它 AI 成功多为 1 点；一键标注约 6 点"
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
            正式额度以云端「已用 / 上限」为准（成功才扣点）。邀请分会加进每月上限，不是另一套钱包。
          </p>
        </section>

        {/* 功能区：左操作 / 右用量，不再整页竖排 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <section className="pf-card px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                云端同步
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                自动：登录/保存时上传。手动：只写本机，需要时再同步。
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
                去「我的项目」拉取 / 推送 →
              </Link>
            </section>

            <section className="pf-card px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  邀请好友
                </p>
                <button
                  type="button"
                  disabled={inviteLoading}
                  onClick={() => void loadInvite()}
                  className="text-[11px] text-brand hover:underline disabled:opacity-40"
                >
                  {inviteLoading ? "…" : "刷新"}
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                双方各得 {invite?.rewardPoints ?? INVITE_REWARD_POINTS} 分 · 最多{" "}
                {invite?.maxSuccess ?? 6} 人 · 上限{" "}
                {invite?.pointsCap ?? 300}
              </p>
              {inviteError ? (
                <p className="mt-2 text-[11px] text-amber-700">{inviteError}</p>
              ) : null}
              {invite ? (
                <div className="mt-3 space-y-2 text-[11px] text-foreground">
                  <p className="break-all text-muted">
                    邀请码{" "}
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
                    复制邀请链接
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-muted">
                  {inviteLoading ? "加载中…" : "暂无邀请信息"}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-dashed border-border bg-white px-4 py-4">
              <p className="text-xs font-medium text-foreground">升级为团队</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                多人共享款式库、成员权限、团队额度即将开放。
              </p>
              <button
                type="button"
                disabled
                className="mt-3 cursor-not-allowed rounded-md border border-border bg-background px-3 py-1.5 text-[11px] text-muted"
              >
                即将开放
              </button>
            </section>
          </div>

          <section className="pf-card px-4 py-4 lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                AI 用量明细
              </p>
              <button
                type="button"
                disabled={usageLoading}
                onClick={() => void loadUsage(page)}
                className="text-[11px] text-brand hover:underline disabled:opacity-40"
              >
                {usageLoading ? "刷新中…" : "刷新"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              本月 {cloudUsage?.total ?? 0} 条记录 · 超额将暂时无法调用 AI
            </p>
            {usageError ? (
              <p className="mt-2 text-[11px] text-amber-700">{usageError}</p>
            ) : null}

            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-muted">
                <span>功能</span>
                <span>点数</span>
                <span>时间</span>
              </div>
              {items.length === 0 ? (
                <p className="px-2.5 py-8 text-center text-[11px] text-muted">
                  {usageLoading ? "加载明细…" : "本月暂无消耗记录"}
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
                            <span className="ml-1 text-amber-600">失败</span>
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
                上一页
              </button>
              <span className="text-[11px] text-muted">
                第 {page} / {totalPages} 页
              </span>
              <button
                type="button"
                disabled={usageLoading || page >= totalPages}
                onClick={() => void loadUsage(page + 1)}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
