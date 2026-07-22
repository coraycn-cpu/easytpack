"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type StudioTopChromeProps = {
  currentProjectId: string;
  projectTitle: string;
  onTip?: (message: string) => void;
};

/** 画布顶栏：项目切换 / 同步 / 登录（横条，不挤左侧） */
export default function StudioTopChrome({
  currentProjectId,
  projectTitle,
  onTip,
}: StudioTopChromeProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ok = isSupabaseConfigured();
    setConfigured(ok);
    if (ok) {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setEmail(data.user?.email ?? null);
      } catch {
        setEmail(null);
      }
    } else {
      setEmail(null);
    }
    try {
      const list = await listProjects();
      setProjects(list.slice(0, 16));
    } catch {
      setProjects([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, currentProjectId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

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
  const loginHref = `/login?next=${encodeURIComponent(`/project/${currentProjectId}/studio`)}`;

  return (
    <div className="z-20 flex shrink-0 items-center gap-2 border-b border-[#cbd5e1] bg-white px-3 py-1.5">
      <div className="relative min-w-0 flex-1" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-slate-50"
          title="切换项目"
        >
          <span className="truncate text-sm font-semibold text-slate-800">
            {projectTitle?.trim() || "未命名款式"}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400">
            {menuOpen ? "▴" : "▾"}
          </span>
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-500">
              我的项目
            </p>
            <ul className="max-h-56 overflow-y-auto py-1">
              <li>
                <span className="block truncate bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">
                  当前 · {projectTitle?.trim() || "本款"}
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
                    className="block truncate px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {p.title || "未命名"}
                  </Link>
                </li>
              ))}
              {others.length === 0 && (
                <li className="px-3 py-1.5 text-[11px] text-slate-400">
                  暂无其它项目
                </li>
              )}
            </ul>
            <Link
              href="/projects"
              className="block border-t border-slate-100 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50"
              onClick={() => setMenuOpen(false)}
            >
              打开全部项目 →
            </Link>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={syncBusy || !ready}
          onClick={() => void handleSync()}
          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
        >
          {syncBusy ? "同步中…" : "同步到网上"}
        </button>

        {!ready ? (
          <span className="px-1 text-[11px] text-slate-300">…</span>
        ) : !configured ? (
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            本机模式
          </span>
        ) : email ? (
          <>
            <span
              className="hidden max-w-[9rem] truncate text-[11px] text-slate-500 md:inline"
              title={email}
            >
              {email}
            </span>
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignOut()}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              退出
            </button>
          </>
        ) : (
          <Link
            href={loginHref}
            className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
          >
            登录
          </Link>
        )}
      </div>
    </div>
  );
}
