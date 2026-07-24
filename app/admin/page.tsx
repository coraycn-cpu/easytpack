"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type Tab =
  | "overview"
  | "users"
  | "events"
  | "packs"
  | "storage"
  | "logs"
  | "config";

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
  inviteBonus?: number;
  adminBonus?: number;
  plan?: string;
  notes?: string | null;
  paused?: boolean;
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
  reviewStatus?: string | null;
  reviewNote?: string | null;
};

type PackItem = {
  id: string;
  userId: string;
  email: string | null;
  title: string;
  styleNo: string | null;
  workflowStatus: string;
  versionCount: number;
  updatedAt: string;
};

type PackVersionItem = {
  id: string;
  kind: string;
  sourceAction: string | null;
  createdAt: string;
  projectUpdatedAt: string | null;
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
  { id: "packs", label: "备份" },
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [entPlan, setEntPlan] = useState<"free" | "comped" | "paused">("free");
  const [entBonus, setEntBonus] = useState("0");
  const [entNotes, setEntNotes] = useState("");
  const [entBusy, setEntBusy] = useState(false);
  const [entTip, setEntTip] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventConsent, setEventConsent] = useState<"all" | "true" | "false">(
    "true",
  );
  const [eventReview, setEventReview] = useState<
    "all" | "pending" | "approved" | "rejected" | "unset"
  >("pending");
  const [eventPage, setEventPage] = useState(1);
  const [eventTotalPages, setEventTotalPages] = useState(1);
  const [eventBusyId, setEventBusyId] = useState<string | null>(null);
  const [packs, setPacks] = useState<PackItem[]>([]);
  const [packQ, setPackQ] = useState("");
  const [packPage, setPackPage] = useState(1);
  const [packTotalPages, setPackTotalPages] = useState(1);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [packVersions, setPackVersions] = useState<PackVersionItem[]>([]);
  const [packTip, setPackTip] = useState<string | null>(null);
  const [packBusy, setPackBusy] = useState(false);
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
  const [orphanItems, setOrphanItems] = useState<
    Array<{
      path: string;
      size: number;
      userId: string;
      projectId: string | null;
      reason: string;
    }>
  >([]);
  const [orphanMeta, setOrphanMeta] = useState<{
    orphanCount: number;
    note?: string;
  } | null>(null);
  const [orphanUserId, setOrphanUserId] = useState("");
  const [orphanBusy, setOrphanBusy] = useState(false);
  const [orphanTip, setOrphanTip] = useState<string | null>(null);
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

  const openUserEntitlement = (u: UserItem) => {
    setSelectedUserId(u.userId);
    setEntPlan(
      u.plan === "comped" || u.plan === "paused" || u.plan === "free"
        ? u.plan
        : "free",
    );
    setEntBonus(String(u.adminBonus ?? 0));
    setEntNotes(u.notes ?? "");
    setEntTip(null);
  };

  const saveUserEntitlement = async () => {
    if (!selectedUserId || entBusy) return;
    const bonus = Number(entBonus);
    if (!Number.isFinite(bonus) || bonus < 0) {
      setEntTip("加赠额度须为非负数字");
      return;
    }
    setEntBusy(true);
    setEntTip(null);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(selectedUserId)}/entitlement`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: entPlan,
            aiMonthlyBonus: Math.floor(bonus),
            notes: entNotes.trim() || null,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        hint?: string;
        ok?: boolean;
      } | null;
      if (!res.ok) {
        throw new Error(
          [json?.error, json?.hint].filter(Boolean).join(" · ") ||
            "保存失败",
        );
      }
      setEntTip("已保存权益（已写审计日志）");
      await loadUsers(userPage, userQ);
    } catch (e) {
      setEntTip(e instanceof Error ? e.message : "保存失败");
    } finally {
      setEntBusy(false);
    }
  };

  const loadEvents = useCallback(
    async (
      page: number,
      consent: "all" | "true" | "false",
      review: "all" | "pending" | "approved" | "rejected" | "unset",
    ) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          pageSize: "30",
        });
        if (consent !== "all") qs.set("consent", consent);
        if (review !== "all") qs.set("reviewStatus", review);
        const res = await fetch(`/api/admin/events?${qs}`);
        const json = (await res.json().catch(() => null)) as {
          items?: EventItem[];
          totalPages?: number;
          page?: number;
          error?: string;
          hint?: string;
        } | null;
        if (!res.ok) {
          throw new Error(
            [json?.error, json?.hint].filter(Boolean).join(" · ") ||
              "读取事件失败",
          );
        }
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

  const reviewEvent = async (
    eventId: string,
    reviewStatus: "approved" | "rejected" | "pending",
  ) => {
    if (eventBusyId) return;
    setEventBusyId(eventId);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewStatus }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        hint?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          [json?.error, json?.hint].filter(Boolean).join(" · ") ||
            "审核失败",
        );
      }
      await loadEvents(eventPage, eventConsent, eventReview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "审核失败");
    } finally {
      setEventBusyId(null);
    }
  };

  const loadPacks = useCallback(async (page: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/packs?page=${page}&pageSize=20&q=${encodeURIComponent(q)}`,
      );
      const json = (await res.json().catch(() => null)) as {
        items?: PackItem[];
        totalPages?: number;
        page?: number;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "读取工艺包失败");
      setPacks(json?.items ?? []);
      setPackPage(json?.page ?? page);
      setPackTotalPages(json?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取工艺包失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const openPackVersions = async (packId: string) => {
    setSelectedPackId(packId);
    setPackTip(null);
    setPackVersions([]);
    setPackBusy(true);
    try {
      const res = await fetch(
        `/api/admin/packs/${encodeURIComponent(packId)}/versions`,
      );
      const json = (await res.json().catch(() => null)) as {
        versions?: PackVersionItem[];
        error?: string;
        hint?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          [json?.error, json?.hint].filter(Boolean).join(" · ") ||
            "读取版本失败",
        );
      }
      setPackVersions(json?.versions ?? []);
    } catch (e) {
      setPackTip(e instanceof Error ? e.message : "读取版本失败");
    } finally {
      setPackBusy(false);
    }
  };

  const createPackCheckpoint = async () => {
    if (!selectedPackId || packBusy) return;
    setPackBusy(true);
    setPackTip(null);
    try {
      const res = await fetch(
        `/api/admin/packs/${encodeURIComponent(selectedPackId)}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "checkpoint" }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "创建检查点失败");
      setPackTip(json?.message || "已创建检查点");
      await openPackVersions(selectedPackId);
      await loadPacks(packPage, packQ);
    } catch (e) {
      setPackTip(e instanceof Error ? e.message : "创建检查点失败");
    } finally {
      setPackBusy(false);
    }
  };

  const restorePackVersion = async (versionId: string) => {
    if (!selectedPackId || packBusy) return;
    const ok = window.confirm(
      "确认把该工艺包恢复到选定版本？恢复前会自动再存一个检查点，方便回滚。",
    );
    if (!ok) return;
    setPackBusy(true);
    setPackTip(null);
    try {
      const res = await fetch(
        `/api/admin/packs/${encodeURIComponent(selectedPackId)}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore", versionId }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "恢复失败");
      setPackTip(json?.message || "已恢复");
      await openPackVersions(selectedPackId);
      await loadPacks(packPage, packQ);
    } catch (e) {
      setPackTip(e instanceof Error ? e.message : "恢复失败");
    } finally {
      setPackBusy(false);
    }
  };

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

  const scanOrphans = async (userId?: string) => {
    setOrphanBusy(true);
    setOrphanTip(null);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: "200" });
      if (userId?.trim()) qs.set("userId", userId.trim());
      const res = await fetch(`/api/admin/storage/orphans?${qs}`);
      const json = (await res.json().catch(() => null)) as {
        orphans?: Array<{
          path: string;
          size: number;
          userId: string;
          projectId: string | null;
          reason: string;
        }>;
        orphanCount?: number;
        note?: string;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "扫描孤儿文件失败");
      setOrphanItems(json?.orphans ?? []);
      setOrphanMeta({
        orphanCount: json?.orphanCount ?? 0,
        note: json?.note,
      });
      setOrphanTip(
        `dry-run：找到 ${json?.orphanCount ?? 0} 个未被引用的文件（下列最多 200）`,
      );
    } catch (e) {
      setOrphanTip(e instanceof Error ? e.message : "扫描失败");
    } finally {
      setOrphanBusy(false);
    }
  };

  const deleteOrphans = async () => {
    if (orphanBusy) return;
    if (!orphanItems.length) {
      setOrphanTip("请先点「扫描孤儿（dry-run）」");
      return;
    }
    const ok = window.confirm(
      `确认删除当前列表中的 ${orphanItems.length} 个孤儿文件？删除后文件本身不可自动还原（工艺包可用备份分区恢复元数据）。`,
    );
    if (!ok) return;
    setOrphanBusy(true);
    setOrphanTip(null);
    try {
      const res = await fetch("/api/admin/storage/orphans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          paths: orphanItems.map((o) => o.path),
          userId: orphanUserId.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        deleted?: number;
        note?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "删除失败");
      setOrphanTip(json?.message || `已删除 ${json?.deleted ?? 0} 个`);
      setOrphanItems([]);
      setOrphanMeta(null);
      await loadStorage();
    } catch (e) {
      setOrphanTip(e instanceof Error ? e.message : "删除失败");
    } finally {
      setOrphanBusy(false);
    }
  };

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
    if (tab === "events") void loadEvents(1, eventConsent, eventReview);
    if (tab === "packs") void loadPacks(1, packQ);
    if (tab === "storage") void loadStorage();
    if (tab === "logs") void loadLogs(1, logKind, logQ);
    if (tab === "config") void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab switch loads; search has own triggers
  }, [ready, allowed, tab]);

  const exportEvents = async (fmt: "jsonl" | "csv" | "gold") => {
    const qs = new URLSearchParams({ export: fmt });
    if (fmt !== "gold" && eventConsent !== "all") {
      qs.set("consent", eventConsent);
    }
    if (fmt !== "gold" && eventReview !== "all") {
      qs.set("reviewStatus", eventReview);
    }
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
              日常运营：用户 · 训练审核 · 备份恢复 · 存储清理（支付接口暂缓）
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
            <p className="text-[10px] text-zinc-400">
              点击用户可设置人工加赠额度、暂停 AI（不接支付；comped=内部赠送）。
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-[1.3fr_0.5fr_0.7fr_0.55fr_0.45fr] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[10px] font-medium text-zinc-500">
                <span>用户</span>
                <span>档位</span>
                <span>本月 AI</span>
                <span>加赠</span>
                <span>邀请</span>
              </div>
              {users.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-400">
                  {loading ? "加载中…" : "暂无用户"}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {users.map((u) => (
                    <li key={u.userId}>
                      <button
                        type="button"
                        onClick={() => openUserEntitlement(u)}
                        className={`grid w-full grid-cols-[1.3fr_0.5fr_0.7fr_0.55fr_0.45fr] gap-2 px-3 py-2 text-left text-[11px] hover:bg-zinc-50 ${
                          selectedUserId === u.userId ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-800">
                            {u.email || shortId(u.userId)}
                          </p>
                          <p className="truncate text-[10px] text-zinc-400">
                            码 {u.inviteCode} · 积分 {u.points}
                          </p>
                        </div>
                        <span
                          className={`tabular-nums ${
                            u.paused ? "text-amber-700" : "text-zinc-700"
                          }`}
                        >
                          {u.plan === "paused"
                            ? "暂停"
                            : u.plan === "comped"
                              ? "赠送"
                              : "免费"}
                        </span>
                        <span className="tabular-nums text-zinc-700">
                          {u.monthUsed}/{u.monthLimit}
                        </span>
                        <span className="tabular-nums text-zinc-700">
                          {u.adminBonus ?? 0}
                        </span>
                        <span className="tabular-nums text-zinc-700">
                          {u.inviteSuccess}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedUserId ? (
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs font-medium text-zinc-800">
                  编辑权益 · {shortId(selectedUserId)}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block text-[11px] text-zinc-600">
                    档位
                    <select
                      value={entPlan}
                      onChange={(e) =>
                        setEntPlan(e.target.value as typeof entPlan)
                      }
                      className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs"
                    >
                      <option value="free">free 免费</option>
                      <option value="comped">comped 内部赠送</option>
                      <option value="paused">paused 暂停 AI</option>
                    </select>
                  </label>
                  <label className="block text-[11px] text-zinc-600">
                    人工加赠月额度
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={entBonus}
                      onChange={(e) => setEntBonus(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs"
                    />
                  </label>
                  <label className="block text-[11px] text-zinc-600 sm:col-span-1">
                    备注
                    <input
                      value={entNotes}
                      onChange={(e) => setEntNotes(e.target.value)}
                      placeholder="运营备注"
                      className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={entBusy}
                    onClick={() => void saveUserEntitlement()}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
                  >
                    {entBusy ? "保存中…" : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-50"
                  >
                    收起
                  </button>
                  {entTip ? (
                    <span className="text-[11px] text-zinc-500">{entTip}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

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
                  void loadEvents(1, v, eventReview);
                }}
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px]"
              >
                <option value="true">仅 consent=true</option>
                <option value="false">仅 consent=false</option>
                <option value="all">全部</option>
              </select>
              <select
                value={eventReview}
                onChange={(e) => {
                  const v = e.target.value as typeof eventReview;
                  setEventReview(v);
                  void loadEvents(1, eventConsent, v);
                }}
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px]"
              >
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
                <option value="unset">未标记</option>
                <option value="all">审核不限</option>
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
              <button
                type="button"
                onClick={() => void exportEvents("gold")}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800 hover:bg-emerald-100"
              >
                导出金标准包
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              金标准包 = consent=true 且审核通过；导出 JSON 含
              manifest（过滤条件）与 events。
            </p>
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
                      <div className="min-w-0 flex-1">
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
                          {ev.reviewStatus ? (
                            <span className="ml-1 text-zinc-500">
                              ·{" "}
                              {ev.reviewStatus === "approved"
                                ? "通过"
                                : ev.reviewStatus === "rejected"
                                  ? "拒绝"
                                  : "待审"}
                            </span>
                          ) : (
                            <span className="ml-1 text-zinc-400">· 未标记</span>
                          )}
                        </p>
                        <p className="truncate text-[10px] text-zinc-400">
                          {shortId(ev.userId)} ·{" "}
                          {[ev.provider, ev.model].filter(Boolean).join(" / ") ||
                            "—"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={eventBusyId === ev.id}
                            onClick={() => void reviewEvent(ev.id, "approved")}
                            className="rounded border border-emerald-200 px-1.5 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            disabled={eventBusyId === ev.id}
                            onClick={() => void reviewEvent(ev.id, "rejected")}
                            className="rounded border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                          >
                            拒绝
                          </button>
                          <button
                            type="button"
                            disabled={eventBusyId === ev.id}
                            onClick={() => void reviewEvent(ev.id, "pending")}
                            className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                          >
                            待审
                          </button>
                        </div>
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
                onClick={() =>
                  void loadEvents(eventPage - 1, eventConsent, eventReview)
                }
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
                onClick={() =>
                  void loadEvents(eventPage + 1, eventConsent, eventReview)
                }
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </section>
        ) : null}

        {tab === "packs" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={packQ}
                onChange={(e) => setPackQ(e.target.value)}
                placeholder="搜标题 / 款号 / 项目ID"
                className="min-w-[12rem] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadPacks(1, packQ)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-[11px] hover:bg-zinc-50"
              >
                搜索
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              用户把款设为「审阅中 / 已定稿」并同步到云端时，会自动写入版本快照。这里可手动建检查点或恢复。
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-[1.4fr_0.6fr_0.5fr_0.55fr] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[10px] font-medium text-zinc-500">
                <span>工艺包</span>
                <span>状态</span>
                <span>版本数</span>
                <span>更新</span>
              </div>
              {packs.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-400">
                  {loading ? "加载中…" : "暂无云端工艺包"}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {packs.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => void openPackVersions(p.id)}
                        className={`grid w-full grid-cols-[1.4fr_0.6fr_0.5fr_0.55fr] gap-2 px-3 py-2 text-left text-[11px] hover:bg-zinc-50 ${
                          selectedPackId === p.id ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-800">
                            {p.title}
                          </p>
                          <p className="truncate text-[10px] text-zinc-400">
                            {p.email || shortId(p.userId)} · {shortId(p.id)}
                          </p>
                        </div>
                        <span className="text-zinc-700">
                          {p.workflowStatus === "finalized"
                            ? "已定稿"
                            : p.workflowStatus === "in_review"
                              ? "审阅中"
                              : "草稿"}
                        </span>
                        <span className="tabular-nums text-zinc-700">
                          {p.versionCount}
                        </span>
                        <span className="tabular-nums text-zinc-400">
                          {formatTime(p.updatedAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedPackId ? (
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-800">
                    版本列表 · {shortId(selectedPackId)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={packBusy}
                      onClick={() => void createPackCheckpoint()}
                      className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-40"
                    >
                      {packBusy ? "处理中…" : "从当前稿建检查点"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackId(null);
                        setPackVersions([]);
                        setPackTip(null);
                      }}
                      className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
                    >
                      收起
                    </button>
                  </div>
                </div>
                {packTip ? (
                  <p className="mt-2 text-[11px] text-zinc-500">{packTip}</p>
                ) : null}
                <ul className="mt-3 divide-y divide-zinc-50">
                  {packVersions.length === 0 ? (
                    <li className="py-4 text-center text-[11px] text-zinc-400">
                      {packBusy ? "加载中…" : "还没有版本；可先建检查点"}
                    </li>
                  ) : (
                    packVersions.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-2 py-2 text-[11px]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-800">
                            {v.kind === "user_final"
                              ? "定稿"
                              : v.kind === "user_checkpoint"
                                ? "检查点"
                                : v.kind}
                            {v.sourceAction ? (
                              <span className="ml-1 font-normal text-zinc-400">
                                · {v.sourceAction}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {formatTime(v.createdAt)}
                            {v.projectUpdatedAt
                              ? ` · 稿 ${formatTime(v.projectUpdatedAt)}`
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={packBusy}
                          onClick={() => void restorePackVersion(v.id)}
                          className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
                        >
                          恢复到此
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <button
                type="button"
                disabled={loading || packPage <= 1}
                onClick={() => void loadPacks(packPage - 1, packQ)}
                className="rounded border border-zinc-200 px-2 py-1 disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                第 {packPage} / {packTotalPages} 页
              </span>
              <button
                type="button"
                disabled={loading || packPage >= packTotalPages}
                onClick={() => void loadPacks(packPage + 1, packQ)}
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
                {loading ? "刷新中…" : "刷新占用"}
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
                      <button
                        type="button"
                        className="min-w-0 text-left hover:underline"
                        onClick={() => {
                          setOrphanUserId(s.userId);
                          void scanOrphans(s.userId);
                        }}
                        title="按此用户扫描孤儿文件"
                      >
                        <p className="truncate font-medium text-zinc-800">
                          {s.email || shortId(s.userId)}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {shortId(s.userId)} · 点此按用户扫孤儿
                        </p>
                      </button>
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

            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-zinc-800">孤儿文件治理</p>
              <p className="mt-1 text-[10px] text-zinc-400">
                先 dry-run 看名单，确认后再删。删除有审计；文件本身不可自动还原。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={orphanUserId}
                  onChange={(e) => setOrphanUserId(e.target.value)}
                  placeholder="可选：只扫某用户 UUID"
                  className="min-w-[12rem] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  disabled={orphanBusy}
                  onClick={() => void scanOrphans(orphanUserId || undefined)}
                  className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] hover:bg-zinc-50 disabled:opacity-40"
                >
                  {orphanBusy ? "扫描中…" : "扫描孤儿（dry-run）"}
                </button>
                <button
                  type="button"
                  disabled={orphanBusy || orphanItems.length === 0}
                  onClick={() => void deleteOrphans()}
                  className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 hover:bg-amber-100 disabled:opacity-40"
                >
                  确认删除列表
                </button>
              </div>
              {orphanTip ? (
                <p className="mt-2 text-[11px] text-zinc-500">{orphanTip}</p>
              ) : null}
              {orphanMeta?.note ? (
                <p className="mt-1 text-[10px] text-zinc-400">{orphanMeta.note}</p>
              ) : null}
              {orphanItems.length > 0 ? (
                <ul className="mt-3 max-h-56 overflow-auto divide-y divide-zinc-50 rounded-lg border border-zinc-100">
                  {orphanItems.map((o) => (
                    <li
                      key={o.path}
                      className="flex justify-between gap-2 px-2 py-1.5 text-[10px]"
                    >
                      <span className="min-w-0 truncate font-mono text-zinc-700">
                        {o.path}
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-400">
                        {formatBytes(o.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
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
              审计表记录：导出、审核、备份恢复、孤儿清理、加额度/暂停等写操作。
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
                  M3 已支持：备份恢复（pack_versions）、孤儿文件 dry-run/删除、训练审核队列与金标准导出。支付接口仍不接入。
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
