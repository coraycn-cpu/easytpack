"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import SyncPreferenceControls from "@/components/account/SyncPreferenceControls";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { sumAiMeterUnits, listAiMeterEvents } from "@/lib/ai/metering";
import { getCloudSyncMode } from "@/lib/project/sync-preference";

type CloudUsage = {
  used: number;
  limit: number;
};

export default function AccountPage() {
  const router = useRouter();
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localUnits, setLocalUnits] = useState(0);
  const [localCalls, setLocalCalls] = useState(0);
  const [cloudUsage, setCloudUsage] = useState<CloudUsage | null>(null);

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

  useEffect(() => {
    if (!ready || !email || !configured) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/usage");
        if (!res.ok) return;
        const data = (await res.json()) as CloudUsage;
        if (!cancelled) setCloudUsage(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, email, configured]);

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
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            AI 用量
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-zinc-600">
            <li>
              本机记录：约 {localUnits} 点 · {localCalls} 次成功调用
            </li>
            <li>
              云端本月：
              {cloudUsage
                ? ` ${cloudUsage.used} / ${cloudUsage.limit} 点（免费档）`
                : " 加载中…"}
            </li>
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
            登录后 AI 调用会计入云端额度；超额会暂时无法调用。付费加量下期开放。
          </p>
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
