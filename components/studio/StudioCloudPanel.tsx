"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  isLoggedInForCloud,
  pushAllLocalProjectsToCloud,
} from "@/lib/project/cloud-sync";
import { listProjects } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

type StudioCloudPanelProps = {
  currentProjectId: string;
  onTip?: (message: string) => void;
};

export default function StudioCloudPanel({
  currentProjectId,
  onTip,
}: StudioCloudPanelProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ok = isSupabaseConfigured();
    setConfigured(ok);
    if (!ok) {
      setEmail(null);
      setReady(true);
      return;
    }
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    } catch {
      setEmail(null);
    }
    try {
      const list = await listProjects();
      setProjects(list.slice(0, 12));
    } catch {
      setProjects([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, currentProjectId]);

  const handleSignOut = async () => {
    if (!configured || authBusy) return;
    setAuthBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setEmail(null);
      onTip?.("已退出登录，项目仍留在本机浏览器");
      router.refresh();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSync = async () => {
    if (syncBusy) return;
    const loggedIn = await isLoggedInForCloud();
    if (!loggedIn) {
      onTip?.("请先登录，再同步到网上");
      router.push(`/login?next=/project/${currentProjectId}/studio`);
      return;
    }
    setSyncBusy(true);
    onTip?.("正在同步到云端（含图片，请稍候）…");
    try {
      const all = await listProjects();
      const res = await pushAllLocalProjectsToCloud(all);
      onTip?.(res.message);
      await refresh();
    } finally {
      setSyncBusy(false);
    }
  };

  const others = projects.filter((p) => p.id !== currentProjectId);

  return (
    <div className="border-b border-slate-100 bg-slate-50/80 px-2.5 py-2">
      <p className="text-[10px] font-semibold text-slate-600">账号与项目</p>

      {!ready ? (
        <p className="mt-1 text-[10px] text-slate-400">…</p>
      ) : !configured ? (
        <p className="mt-1 text-[10px] leading-snug text-amber-700">
          云端未配置，可先本机使用
        </p>
      ) : email ? (
        <div className="mt-1 space-y-1">
          <p className="truncate text-[10px] text-slate-500" title={email}>
            {email}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => void handleSync()}
              className="flex-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-1 text-[10px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              {syncBusy ? "同步中…" : "同步到网上"}
            </button>
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignOut()}
              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
            >
              退出
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex gap-1">
          <Link
            href={`/login?next=/project/${currentProjectId}/studio`}
            className="flex-1 rounded bg-zinc-900 px-1.5 py-1 text-center text-[10px] font-medium text-white hover:bg-zinc-700"
          >
            登录
          </Link>
          <button
            type="button"
            onClick={() => void handleSync()}
            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
          >
            同步
          </button>
        </div>
      )}

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="flex w-full items-center justify-between text-[10px] text-slate-600 hover:text-slate-900"
        >
          <span>项目列表</span>
          <span className="text-slate-400">{listOpen ? "收起" : "展开"}</span>
        </button>
        {listOpen && (
          <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto overscroll-contain">
            <li>
              <span className="block truncate rounded bg-blue-50 px-1.5 py-1 text-[10px] font-medium text-blue-800">
                当前 ·{" "}
                {projects.find((p) => p.id === currentProjectId)?.title ??
                  "本款"}
              </span>
            </li>
            {others.map((p) => (
              <li key={p.id}>
                <Link
                  href={
                    p.status === "collecting"
                      ? `/project/${p.id}/studio?fullCollect=1`
                      : `/project/${p.id}/studio`
                  }
                  className="block truncate rounded px-1.5 py-1 text-[10px] text-slate-600 hover:bg-white hover:text-slate-900"
                  title={p.title}
                >
                  {p.title || "未命名"}
                </Link>
              </li>
            ))}
            {others.length === 0 && (
              <li className="px-1.5 py-1 text-[10px] text-slate-400">
                暂无其它项目
              </li>
            )}
            <li>
              <Link
                href="/projects"
                className="mt-0.5 block px-1.5 py-1 text-[10px] text-blue-600 hover:underline"
              >
                打开全部项目 →
              </Link>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
