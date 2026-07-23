"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

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
    category: string | null;
    provider: string | null;
    model: string | null;
    consent: boolean;
    created_at: string;
    tech_pack_id: string | null;
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export default function AdminPage() {
  const router = useRouter();
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewPayload | null>(null);

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
        } | null;
        if (!res.ok) {
          setError(json?.error || "无法校验管理员权限");
          setReady(true);
          return;
        }
        if (!json?.isAdmin) {
          setAllowed(false);
          setReady(true);
          return;
        }
        setAllowed(true);
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
      if (!res.ok) {
        throw new Error(json?.error || "读取总览失败");
      }
      setData(json as OverviewPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取总览失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !allowed) return;
    void loadOverview();
  }, [ready, allowed, loadOverview]);

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
        <main className="mx-auto max-w-3xl px-4 py-10">
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
            {error ||
              "当前账号无权限。请在 Vercel 配置 ADMIN_EMAILS（管理员邮箱，逗号分隔）后 Redeploy。"}
          </p>
          <Link href="/account" className="mt-6 inline-block text-sm text-blue-600">
            ← 回用户中心
          </Link>
        </main>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">管理后台</h1>
            <p className="mt-1 text-sm text-zinc-500">
              只读总览：用量、邀请、已同意质量池的 AI 事件
              {data?.adminEmail ? ` · ${data.adminEmail}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadOverview()}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              {loading ? "刷新中…" : "刷新"}
            </button>
            <Link
              href="/account"
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
            >
              用户中心
            </Link>
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-xs text-amber-700">{error}</p>
        ) : null}

        {data?.errors &&
        Object.values(data.errors).some((v) => Boolean(v)) ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <p className="font-medium">部分查询失败</p>
            <ul className="mt-1 list-disc pl-4">
              {Object.entries(data.errors)
                .filter(([, v]) => Boolean(v))
                .map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "注册档案", value: stats?.profileCount },
            { label: "成功邀请", value: stats?.successfulInvites },
            { label: "本月 AI 点", value: stats?.monthAiUnits },
            { label: "Consent 事件", value: stats?.consentedEvents },
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
        </section>

        <section className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            最近 Consent 事件
          </p>
          {(data?.recentEvents?.length ?? 0) === 0 ? (
            <p className="mt-3 text-[11px] text-zinc-400">
              {loading ? "加载中…" : "暂无已同意质量池的事件"}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-50">
              {data!.recentEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="grid grid-cols-[1fr_auto] gap-2 py-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-800">
                      {ev.action}
                      {ev.outcome ? (
                        <span className="ml-1 text-zinc-400">· {ev.outcome}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {shortId(ev.user_id)} · {[ev.provider, ev.model]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </p>
                  </div>
                  <span className="tabular-nums text-zinc-400">
                    {formatTime(ev.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            最近成功邀请
          </p>
          {(data?.recentInvites?.length ?? 0) === 0 ? (
            <p className="mt-3 text-[11px] text-zinc-400">
              {loading ? "加载中…" : "暂无成功邀请记录"}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-50">
              {data!.recentInvites.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[1fr_auto] gap-2 py-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800">
                      +{row.points_awarded} · 码 {row.invite_code}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {shortId(row.inviter_id)} → {shortId(row.invitee_id)}
                    </p>
                  </div>
                  <span className="tabular-nums text-zinc-400">
                    {formatTime(row.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
