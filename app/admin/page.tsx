"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type Tab = "overview" | "users" | "events" | "storage" | "logs" | "config";

type OverviewPayload = {
  adminEmail: string;
  stats: {
    profileCount: number;
    successfulInvites: number;
    monthAiUnits: number;
    consentedEvents: number;
  };
  recentEvents: Array<{
    id: string;
    user_id: string | null;
    action: string;
    outcome: string | null;
    created_at: string;
  }>;
  recentInvites: Array<{
    id: string;
    inviter_id: string;
    invitee_id: string;
    invite_code: string;
    points_awarded: number;
    created_at: string;
  }>;
  errors?: Record<string, string | null>;
};

type UserItem = {
  userId: string;
  email: string | null;
  inviteCode: string;
  points: number;
  monthUsed: number;
  monthLimit: number;
  packCount: number;
  inviteSuccess: number;
  createdAt: string;
};

type EventItem = {
  id: string;
  userId: string | null;
  action: string;
  outcome: string | null;
  consent: boolean;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "总览" },
  { id: "users", label: "用户" },
  { id: "events", label: "训练" },
  { id: "storage", label: "存储" },
  { id: "logs", label: "日志" },
  { id: "config", label: "配置" },
];

export default function AdminPage() {
  const router = useRouter();
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userQ, setUserQ] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventConsent, setEventConsent] = useState<"all" | "true" | "false">(
    "true",
  );
  const [eventPage, setEventPage] = useState(1);
  const [eventTotalPages, setEventTotalPages] = useState(1);
  const [storageItems, setStorageItems] = useState<
    Array<{
      userId: string;
      email: string | null;
      objectCount: number;
      approxBytes: number;
    }>
  >([]);
  const [storageMeta, setStorageMeta] = useState<{
    totalObjects: number;
    totalBytes: number;
    note?: string;
  } | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [logKind, setLogKind] = useState<
    "audit" | "usage" | "invites" | "ai_errors" | "consent"
  >("audit");
  const [logItems, setLogItems] = useState<
    Array<{
      id: string;
      at: string;
      title: string;
      subtitle?: string;
      ok?: boolean;
    }>
  >([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logQ, setLogQ] = useState("");
  const [logHint, setLogHint] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) {
        router.replace("/login?next=/admin");
        return;
      }
      try {
        const res = await fetch("/api/admin/me");
        const json = (await res.json().catch(() => null)) as {
          isAdmin?: boolean;
          error?: string;
          hint?: string | null;
        } | null;
        if (!json?.isAdmin) {
          setAllowed(false);
          setError(json?.hint || json?.error || "当前账号无权限");
          setReady(true);
          return;
        }
        setAllowed(true);
        if (json.hint) setHint(json.hint);
        setReady(true);
      } catch {
        setError("无法校验管理员权限");
        setReady(true);
      }
    });
  }, [configured, router]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      const json = (await res.json().catch(() => null)) as
        | (OverviewPayload & { error?: string })
        | null;
      if (!res.ok) throw new Error(json?.error || "读取总览失败");
      setOverview(json as OverviewPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取总览失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (page: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users?page=${page}&pageSize=20&q=${encodeURIComponent(q)}`,
      );
      const json = (await res.json().catch(() => null)) as {
        items?: UserItem[];
        totalPages?: number;
        page?: number;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "读取用户失败");
      setUsers(json?.items ?? []);
      setUserPage(json?.page ?? page);
      setUserTotalPages(json?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取用户失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = useCallback(
    async (page: number, consent: "all" | "true" | "false") => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          pageSize: "30",
        });
        if (consent !== "all") qs.set("consent", consent);
        const res = await fetch(`/api/admin/events?${qs}`);
        const json = (await res.json().catch(() => null)) as {
          items?: EventItem[];
          totalPages?: number;
          page?: number;
          error?: string;
        } | null;
        if (!res.ok) throw new Error(json?.error || "读取事件失败");
        setEvents(json?.items ?? []);
        setEventPage(json?.page ?? page);
        setEventTotalPages(json?.totalPages ?? 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "读取事件失败");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadStorage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/storage");
      const json = (await res.json().catch(() => null)) as {
        items?: Array<{
          userId: string;
          email: string | null;
          objectCount: number;
          approxBytes: number;
        }>;
        totalObjects?: number;
        totalBytes?: number;
        note?: string;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "读取存储失败");
      setStorageItems(json?.items ?? []);
      setStorageMeta({
        totalObjects: json?.totalObjects ?? 0,
        totalBytes: json?.totalBytes ?? 0,
        note: json?.note,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取存储失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/config");
      const json = (await res.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error || "读取配置失败",
        );
      }
      setConfig(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(
    async (
      page: number,
      kind: "audit" | "usage" | "invites" | "ai_errors" | "consent",
      q: string,
    ) => {
      setLoading(true);
      setError(null);
      setLogHint(null);
      try {
        const qs = new URLSearchParams({
          kind,
          page: String(page),
          pageSize: "30",
        });
        if (q.trim()) qs.set("q", q.trim());
        const res = await fetch(`/api/admin/logs?${qs}`);
        const json = (await res.json().catch(() => null)) as {
          items?: Array<{
            id: string;
            at: string;
            title: string;
            subtitle?: string;
            ok?: boolean;
          }>;
          page?: number;
          totalPages?: number;
          error?: string;
          hint?: string;
        } | null;
        if (!res.ok) {
          setLogHint(json?.hint ?? null);
          throw new Error(json?.error || "读取日志失败");
        }
        setLogItems(json?.items ?? []);
        setLogPage(json?.page ?? page);
        setLogTotalPages(json?.totalPages ?? 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "读取日志失败");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!ready || !allowed) return;
    if (tab === "overview") void loadOverview();
    if (tab === "users") void loadUsers(1, userQ);
    if (tab === "events") void loadEvents(1, eventConsent);
    if (tab === "storage") void loadStorage();
    if (tab === "logs") void loadLogs(1, logKind, logQ);
    if (tab === "config") void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab switch loads; search has own triggers
  }, [ready, allowed, tab]);

  const exportEvents = async (fmt: "jsonl" | "csv") => {
    const qs = new URLSearchParams({ export: fmt });
    if (eventConsent !== "all") qs.set("consent", eventConsent);
    window.open(`/api/admin/events?${qs}`, "_blank");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载管理后台…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppHeader />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-semibold text-zinc-900">管理后台</h1>
          <p className="mt-3 text-sm text-zinc-500">当前未配置云端，无法使用。</p>
        </main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-2xl font-semibold text-zinc-900">管理后台</h1>
          <p className="mt-3 text-sm text-zinc-500">
            {error || "当前账号无权限。"}
          </p>
          <Link href="/account" className="mt-6 inline-block text-sm text-blue-600">
            ← 回用户中心
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">管理后台</h1>
            <p className="mt-1 text-sm text-zinc-500">
              日常运营：用户 · 训练 · 额度巡查 · 存储（支付接口暂缓）
            </p>
          </div>
          <Link
            href="/account"
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
          >
            用户中心
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                tab === t.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {hint ? <p className="mb-3 text-xs text-amber-700">{hint}</p> : null}
        {error ? <p className="mb-3 text-xs text-amber-700">{error}</p> : null}

        {tab === "overview" ? (
          <section className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadOverview()}
                className="text-[11px] text-blue-600 hover:underline disabled:opacity-40"
              >
                {loading ? "刷新中…" : "刷新"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "注册档案", value: overview?.stats.profileCount },
                { label: "成功邀请", value: overview?.stats.successfulInvites },
                { label: "本月 AI 点", value: overview?.stats.monthAiUnits },
                { label: "Consent 事件", value: overview?.stats.consentedEvents },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-3"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
                    {item.value ?? (loading ? "…" : "—")}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                最近 Consent 事件
              </p>
              <ul className="mt-2 divide-y divide-zinc-50">
                {(overview?.recentEvents ?? []).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex justify-between gap-2 py-2 text-[11px]"
                  >
                    <span className="truncate text-zinc-800">
                      {ev.action}
                      {ev.outcome ? ` · ${ev.outcome}` : ""}
                    </span>
                    <span className="shrink-0 text-zinc-400">
                      {formatTime(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {tab === "users" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                placeholder="搜邮箱 / 邀请码"
                className="min-w-[12rem] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadUsers(1, userQ)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-[11px] hover:bg-zinc-50"
              >
                搜索
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-[1.4fr_0.6fr_0.7fr_0.5fr_0.5fr] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[10px] font-medium text-zinc-500">
                <span>用户</span>
                <span>积分</span>
                <span>本月 AI</span>
                <span>款数</span>
                <span>邀请</span>
              </div>
              {users.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-400">
                  {loading ? "加载中…" : "暂无用户"}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {users.map((u) => (
                    <li
                      key={u.userId}
                      className="grid grid-cols-[1.4fr_0.6fr_0.7fr_0.5fr_0.5fr] gap-2 px-3 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-800">
                          {u.email || shortId(u.userId)}
                        </p>
                        <p className="truncate text-[10px] text-zinc-400">
                          码 {u.inviteCode} · {formatTime(u.createdAt)}
                        </p>
                      </div>
                      <span className="tabular-nums text-zinc-700">{u.points}</span>
                      <span className="tabular-nums text-zinc-700">
                        {u.monthUsed}/{u.monthLimit}
                      </span>
                      <span className="tabular-nums text-zinc-700">
                        {u.packCount}
                      </span>
                      <span className="tabular-nums text-zinc-700">
                        {u.inviteSuccess}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <button
                type="button"
                disabled={loading || userPage <= 1}
                onClick={() => void loadUsers(userPage - 1, userQ)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                第 {userPage} / {userTotalPages} 页
              </span>
              <button
                type="button"
                disabled={loading || userPage >= userTotalPages}
                onClick={() => void loadUsers(userPage + 1, userQ)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </section>
        ) : null}

        {tab === "events" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={eventConsent}
                onChange={(e) => {
                  const v = e.target.value as "all" | "true" | "false";
                  setEventConsent(v);
                  void loadEvents(1, v);
                }}
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px]"
              >
                <option value="true">仅 consent=true</option>
                <option value="false">仅 consent=false</option>
                <option value="all">全部</option>
              </select>
              <button
                type="button"
                onClick={() => void exportEvents("jsonl")}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] hover:bg-zinc-50"
              >
                导出 JSONL
              </button>
              <button
                type="button"
                onClick={() => void exportEvents("csv")}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] hover:bg-zinc-50"
              >
                导出 CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {events.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-400">
                  {loading ? "加载中…" : "暂无事件"}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-start justify-between gap-2 px-3 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-800">
                          {ev.action}
                          {ev.outcome ? (
                            <span className="ml-1 text-zinc-400">
                              · {ev.outcome}
                            </span>
                          ) : null}
                          {!ev.consent ? (
                            <span className="ml-1 text-amber-600">无consent</span>
                          ) : null}
                        </p>
                        <p className="truncate text-[10px] text-zinc-400">
                          {shortId(ev.userId)} ·{" "}
                          {[ev.provider, ev.model].filter(Boolean).join(" / ") ||
                            "—"}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-zinc-400">
                        {formatTime(ev.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <button
                type="button"
                disabled={loading || eventPage <= 1}
                onClick={() => void loadEvents(eventPage - 1, eventConsent)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                第 {eventPage} / {eventTotalPages} 页
              </span>
              <button
                type="button"
                disabled={loading || eventPage >= eventTotalPages}
                onClick={() => void loadEvents(eventPage + 1, eventConsent)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </section>
        ) : null}

        {tab === "storage" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-500">
                桶 style-images
                {storageMeta
                  ? ` · 约 ${storageMeta.totalObjects} 个文件 / ${formatBytes(storageMeta.totalBytes)}`
                  : ""}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadStorage()}
                className="text-[11px] text-blue-600 hover:underline disabled:opacity-40"
              >
                {loading ? "刷新中…" : "刷新"}
              </button>
            </div>
            {storageMeta?.note ? (
              <p className="text-[10px] text-zinc-400">{storageMeta.note}</p>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {storageItems.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-400">
                  {loading ? "统计中…" : "暂无存储目录"}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {storageItems.map((s) => (
                    <li
                      key={s.userId}
                      className="flex justify-between gap-2 px-3 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-800">
                          {s.email || shortId(s.userId)}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {shortId(s.userId)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right tabular-nums text-zinc-600">
                        <p>{s.objectCount} 文件</p>
                        <p className="text-[10px] text-zinc-400">
                          {formatBytes(s.approxBytes)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {tab === "logs" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={logKind}
                onChange={(e) => {
                  const v = e.target.value as typeof logKind;
                  setLogKind(v);
                  void loadLogs(1, v, logQ);
                }}
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px]"
              >
                <option value="audit">管理操作审计</option>
                <option value="usage">AI 用量日志</option>
                <option value="ai_errors">AI 失败日志</option>
                <option value="invites">邀请日志</option>
                <option value="consent">Consent 训练日志</option>
              </select>
              {logKind === "audit" || logKind === "usage" ? (
                <>
                  <input
                    value={logQ}
                    onChange={(e) => setLogQ(e.target.value)}
                    placeholder={
                      logKind === "audit" ? "搜操作 / 邮箱" : "搜 action / 用户ID"
                    }
                    className="min-w-[10rem] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void loadLogs(1, logKind, logQ)}
                    className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] hover:bg-zinc-50"
                  >
                    搜索
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadLogs(1, logKind, "")}
                  className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] hover:bg-zinc-50"
                >
                  {loading ? "刷新中…" : "刷新"}
                </button>
              )}
            </div>
            {logHint ? (
              <p className="text-[11px] text-amber-700">{logHint}</p>
            ) : null}
            <p className="text-[10px] text-zinc-400">
              审计表记录：导出训练数据、搜索用户、查看存储等操作。写操作（加额度/暂停）将在
              M2 一并记入。
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {logItems.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-400">
                  {loading ? "加载中…" : "暂无日志"}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {logItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 px-3 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-800">
                          {item.title}
                          {item.ok === false ? (
                            <span className="ml-1 text-amber-600">失败</span>
                          ) : null}
                        </p>
                        {item.subtitle ? (
                          <p className="truncate text-[10px] text-zinc-400">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 tabular-nums text-zinc-400">
                        {formatTime(item.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <button
                type="button"
                disabled={loading || logPage <= 1}
                onClick={() => void loadLogs(logPage - 1, logKind, logQ)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                第 {logPage} / {logTotalPages} 页
              </span>
              <button
                type="button"
                disabled={loading || logPage >= logTotalPages}
                onClick={() => void loadLogs(logPage + 1, logKind, logQ)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </section>
        ) : null}

        {tab === "config" ? (
          <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4 text-[11px] text-zinc-700">
            {config ? (
              <ul className="space-y-2">
                <li>
                  免费月额度：{" "}
                  <strong>{String(config.freeMonthlyAiUnits)}</strong>
                </li>
                <li>
                  邀请：各 {String(config.inviteRewardPoints)} 分 · 最多{" "}
                  {String(config.inviteMaxSuccess)} 人 · 上限{" "}
                  {String(config.invitePointsCap)}
                </li>
                <li>
                  管理员邮箱数：{String(config.adminEmailCount)}（
                  {Array.isArray(config.adminEmailsMasked)
                    ? (config.adminEmailsMasked as string[]).join(", ")
                    : "—"}
                  ）
                </li>
                <li>
                  Service Role：
                  {config.serviceRoleConfigured ? " 已配置" : " 未配置"}
                </li>
                <li>
                  支付：未启用
                  {config.payment &&
                  typeof config.payment === "object" &&
                  config.payment &&
                  "note" in config.payment
                    ? ` · ${String((config.payment as { note?: string }).note)}`
                    : ""}
                </li>
                <li className="pt-2 text-zinc-400">
                  下一步（M2）：人工加赠额度、暂停用户、审计日志；支付只做条件位，不接接口。
                </li>
              </ul>
            ) : (
              <p className="text-zinc-400">{loading ? "加载中…" : "暂无配置"}</p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
