"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { syncAfterLogin } from "@/lib/project/cloud-sync";
import {
  FREE_MONTHLY_AI_GIFT,
  REGISTER_CTA_LABEL,
  STUDIO_GUEST_BAR_TEXT,
} from "@/lib/ai/login-gate";
import StudioAccountChip from "@/components/studio/StudioAccountChip";
import { resolveProjectRepository } from "@/lib/project/repository";
import {
  getCloudSyncMode,
  setCloudSyncMode,
  subscribeCloudSyncMode,
  type CloudSyncMode,
} from "@/lib/project/sync-preference";
import {
  getCloudSyncStatus,
  subscribeCloudSyncStatus,
} from "@/lib/project/sync-status";
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
  const [syncMode, setSyncMode] = useState<CloudSyncMode>("auto");

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
      const repo = await resolveProjectRepository();
      const list = await repo.list();
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
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    setSyncMode(getCloudSyncMode());
    return subscribeCloudSyncMode(setSyncMode);
  }, []);

  useEffect(() => {
    return subscribeCloudSyncStatus((s) => {
      if (s && !s.ok) onTip?.(s.message);
    });
  }, [onTip]);

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
    const { gateCloudSaveLogin } = await import("@/lib/ai/client-login-gate");
    const gate = await gateCloudSaveLogin({
      next: `/project/${currentProjectId}/studio`,
    });
    if (!gate.ok) {
      onTip?.(gate.message);
      router.push(gate.href);
      return;
    }
    setSyncBusy(true);
    onTip?.("正在双向同步（含图片，请稍候）…");
    try {
      const res = await syncAfterLogin();
      onTip?.(res.message);
      const status = getCloudSyncStatus();
      if (status && !status.ok) onTip?.(status.message);
      await refresh();
    } finally {
      setSyncBusy(false);
    }
  };

  const others = projects.filter((p) => p.id !== currentProjectId);
  const loginHref = `/login?mode=register&next=${encodeURIComponent(`/project/${currentProjectId}/studio`)}`;
  const showGuestHint = ready && configured && !email;

  return (
    <div
      className={`relative flex shrink-0 items-center gap-2 overflow-visible border-b border-[#cbd5e1] bg-white px-3 py-1.5 ${
        menuOpen ? "z-50" : "z-30"
      }`}
    >
      <div className="relative min-w-0 shrink overflow-visible" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex max-w-[10rem] items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-slate-50 sm:max-w-[14rem]"
          title="切换项目"
          aria-expanded={menuOpen}
        >
          <span className="truncate text-sm font-semibold text-slate-800">
            {projectTitle?.trim() || "未命名款式"}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400">
            {menuOpen ? "▴" : "▾"}
          </span>
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-[60] mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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

      {showGuestHint ? (
        <p
          className="hidden min-w-0 flex-1 truncate text-[11px] text-amber-800/90 md:block"
          title={STUDIO_GUEST_BAR_TEXT}
        >
          可手动标注 · 本机已自动保存 · 注册送每月 {FREE_MONTHLY_AI_GIFT} 点
          AI + 云端存档
        </p>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {/* 同步 + 自动：合并成一个控件，少占宽度 */}
        <div
          className={`inline-flex items-center overflow-hidden rounded-md border ${
            syncMode === "auto"
              ? "border-blue-200 bg-blue-50"
              : "border-slate-200 bg-white"
          }`}
          title={
            syncMode === "auto"
              ? "自动同步已开：保存/登录会上传；点左侧可立即同步"
              : "自动同步已关：点左侧「同步」才会上传到网上"
          }
        >
          <button
            type="button"
            disabled={syncBusy || !ready}
            onClick={() => void handleSync()}
            className={`px-2 py-1 text-[11px] font-medium disabled:opacity-50 ${
              syncMode === "auto"
                ? "text-blue-800 hover:bg-blue-100"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {syncBusy ? "同步中…" : "同步"}
          </button>
          <span
            className={`h-4 w-px shrink-0 ${
              syncMode === "auto" ? "bg-blue-200" : "bg-slate-200"
            }`}
            aria-hidden
          />
          <button
            type="button"
            role="switch"
            aria-checked={syncMode === "auto"}
            disabled={!ready}
            onClick={() => {
              const next: CloudSyncMode =
                syncMode === "auto" ? "manual" : "auto";
              setCloudSyncMode(next);
              onTip?.(
                next === "auto"
                  ? "已开自动同步：之后保存/登录会自动上传"
                  : "已关自动同步：保存只留本机，需点「同步」才上传",
              );
            }}
            className={`flex items-center gap-1.5 px-2 py-1 text-[11px] disabled:opacity-50 ${
              syncMode === "auto"
                ? "text-blue-800 hover:bg-blue-100"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span
              className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition ${
                syncMode === "auto" ? "bg-blue-600" : "bg-slate-300"
              }`}
              aria-hidden
            >
              <span
                className={`absolute h-2.5 w-2.5 rounded-full bg-white shadow transition ${
                  syncMode === "auto" ? "left-[11px]" : "left-0.5"
                }`}
              />
            </span>
            <span className="font-medium">自动</span>
          </button>
        </div>

        {!ready ? (
          <span className="px-1 text-[11px] text-slate-300">…</span>
        ) : !configured ? (
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            本机模式
          </span>
        ) : email ? (
          <StudioAccountChip
            email={email}
            authBusy={authBusy}
            onSignOut={() => void handleSignOut()}
            onTip={onTip}
          />
        ) : (
          <Link
            href={loginHref}
            className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
            title={STUDIO_GUEST_BAR_TEXT}
          >
            {REGISTER_CTA_LABEL}
          </Link>
        )}
      </div>
    </div>
  );
}
