"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import SyncPreferenceControls from "@/components/account/SyncPreferenceControls";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  aiMeterActionLabel,
  listAiMeterEvents,
  sumAiMeterUnits,
} from "@/lib/ai/metering";
import { getCloudSyncMode } from "@/lib/project/sync-preference";

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

export default function AccountPage() {
  const router = useRouter();
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localUnits, setLocalUnits] = useState(0);
  const [localCalls, setLocalCalls] = useState(0);
  const [page, setPage] = useState(1);
  const [usageLoading, setUsageLoading] = useState(false);
  const [cloudUsage, setCloudUsage] = useState<CloudUsagePage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/account");
        return;
      }
      setEmail(data.user.email ?? null);
      setReady(true);
    });
  }, [configured, router]);

  useEffect(() => {
    setLocalUnits(sumAiMeterUnits());
    setLocalCalls(listAiMeterEvents().filter((e) => e.ok).length);
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

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载账号…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-2xl font-semibold text-zinc-900">用户中心</h1>
          <p className="mt-3 text-sm text-zinc-500">
            当前是本机模式（未配置云端）。配置后可登录、同步项目与查看 AI 额度。
          </p>
          <Link href="/projects" className="mt-6 inline-block text-sm text-blue-600">
            ← 我的项目
          </Link>
        </main>
      </div>
    );
  }

  const totalPages = cloudUsage?.totalPages ?? 1;
  const items = cloudUsage?.items ?? [];

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">用户中心</h1>
            <p className="mt-1 text-sm text-zinc-500">
              账号、同步偏好与 AI 用量（团队升级后续开放）
            </p>
          </div>
          <Link
            href="/projects"
            className="shrink-0 text-sm text-zinc-500 hover:text-zinc-800"
          >
            我的项目
          </Link>
        </div>

        {tip ? (
          <p className="mb-4 text-xs text-emerald-700">{tip}</p>
        ) : null}

        <section className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            账号
          </p>
          <p className="mt-2 truncate text-sm font-medium text-zinc-900">
            {email ?? "已登录"}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            个人版 · 当前同步：{getCloudSyncMode() === "auto" ? "自动" : "手动"}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignOut()}
            className="mt-3 rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy ? "退出中…" : "退出登录"}
          </button>
        </section>

        <section className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            云端同步
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            自动：登录/保存时上传。手动：只保存在本机，需要时再同步。
          </p>
          <div className="mt-3">
            <SyncPreferenceControls onChanged={(_m, msg) => setTip(msg)} />
          </div>
          <Link
            href="/projects"
            className="mt-3 inline-block text-[11px] text-blue-600 hover:underline"
          >
            去「我的项目」拉取 / 推送 →
          </Link>
        </section>

        <section className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              AI 用量
            </p>
            <button
              type="button"
              disabled={usageLoading}
              onClick={() => void loadUsage(page)}
              className="text-[11px] text-blue-600 hover:underline disabled:opacity-40"
            >
              {usageLoading ? "刷新中…" : "刷新"}
            </button>
          </div>

          <ul className="mt-2 space-y-1 text-[11px] text-zinc-600">
            <li>
              本机记录：约 {localUnits} 点 · {localCalls} 次成功调用
            </li>
            <li>
              云端本月：
              {cloudUsage
                ? ` ${cloudUsage.used} / ${cloudUsage.limit} 点${
                    cloudUsage.bonus
                      ? `（免费 ${cloudUsage.base ?? "—"} + 邀请 ${cloudUsage.bonus}）`
                      : "（免费档）"
                  }`
                : usageLoading
                  ? " 加载中…"
                  : " —"}
            </li>
            {cloudUsage ? (
              <li className="text-zinc-400">
                本月共 {cloudUsage.total} 条消耗记录
              </li>
            ) : null}
          </ul>

          {usageError ? (
            <p className="mt-2 text-[11px] text-amber-700">{usageError}</p>
          ) : null}

          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-100">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-zinc-100 bg-zinc-50 px-2.5 py-1.5 text-[10px] font-medium text-zinc-500">
              <span>功能</span>
              <span>点数</span>
              <span>时间</span>
            </div>
            {items.length === 0 ? (
              <p className="px-2.5 py-4 text-center text-[11px] text-zinc-400">
                {usageLoading ? "加载明细…" : "本月暂无消耗记录"}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2.5 py-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-800">
                        {aiMeterActionLabel(item.action)}
                        {!item.ok ? (
                          <span className="ml-1 text-amber-600">失败</span>
                        ) : null}
                      </p>
                      <p className="truncate text-[10px] text-zinc-400">
                        {[item.provider, item.model].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </div>
                    <span
                      className={`tabular-nums ${
                        item.ok ? "text-zinc-700" : "text-zinc-400"
                      }`}
                    >
                      {item.ok ? `-${item.units}` : "0"}
                    </span>
                    <span className="tabular-nums text-zinc-400">
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
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-[11px] text-zinc-500">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={usageLoading || page >= totalPages}
              onClick={() => void loadUsage(page + 1)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
            登录后 AI 调用会计入云端额度；邀请好友注册获得的积分会叠加到上限。超额会暂时无法调用。
          </p>
        </section>

        <section className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              邀请好友
            </p>
            <button
              type="button"
              disabled={inviteLoading}
              onClick={() => void loadInvite()}
              className="text-[11px] text-blue-600 hover:underline disabled:opacity-40"
            >
              {inviteLoading ? "刷新中…" : "刷新"}
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            分享注册链接给好友。对方成功注册后，双方各得{" "}
            {invite?.rewardPoints ?? 50}{" "}
            积分（计入 AI 额度）。每人最多成功邀请{" "}
            {invite?.maxSuccess ?? 6} 人，邀请积分上限{" "}
            {invite?.pointsCap ?? 300} 分。
          </p>

          {inviteError ? (
            <p className="mt-2 text-[11px] text-amber-700">{inviteError}</p>
          ) : null}

          {invite ? (
            <div className="mt-3 space-y-2 text-[11px] text-zinc-700">
              <p>
                当前积分：
                <span className="font-semibold tabular-nums text-zinc-900">
                  {invite.points}
                </span>
                <span className="text-zinc-400"> / {invite.pointsCap}</span>
              </p>
              <p>
                已成功邀请：
                <span className="font-semibold tabular-nums">
                  {invite.inviteSuccessCount}/{invite.maxSuccess}
                </span>
                {invite.inviteRemaining > 0
                  ? ` · 还可邀请 ${invite.inviteRemaining} 人`
                  : " · 名额已满"}
              </p>
              <p className="break-all text-zinc-500">
                邀请码：
                <code className="rounded bg-zinc-100 px-1 text-zinc-800">
                  {invite.inviteCode}
                </code>
              </p>
              <button
                type="button"
                disabled={invite.inviteRemaining <= 0}
                onClick={() => void copyInviteLink()}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                复制邀请链接
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-zinc-400">
              {inviteLoading ? "加载邀请信息…" : "暂无邀请信息"}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-4">
          <p className="text-xs font-medium text-zinc-700">升级为团队</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            即将支持：多人共享款式库、成员权限、团队额度。当前仍为个人账号。
          </p>
          <button
            type="button"
            disabled
            className="mt-3 cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-400"
          >
            即将开放
          </button>
        </section>
      </main>
    </div>
  );
}
