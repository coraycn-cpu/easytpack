"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { getCachedAuthUser, invalidateClientAuthCache } from "@/lib/supabase/auth-cache";
import { syncAfterLogin } from "@/lib/project/cloud-sync";
import {
  FREE_MONTHLY_AI_GIFT,
} from "@/lib/ai/login-gate";
import StudioAccountChip from "@/components/studio/StudioAccountChip";
import BrandMark from "@/components/brand/BrandMark";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
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
import { RECENT_PROJECTS_LIMIT, shortProjectTitle, takeRecentProjects } from "@/lib/project/library-display";

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
  const { t } = useLocale();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncMode, setSyncMode] = useState<CloudSyncMode>("auto");

  const refresh = useCallback(async () => {
    const ok = isSupabaseConfigured();
    setConfigured(ok);
    if (ok) {
      try {
        const user = await getCachedAuthUser();
        setEmail(user?.email ?? null);
      } catch {
        setEmail(null);
      }
    } else {
      setEmail(null);
    }
    try {
      const repo = await resolveProjectRepository();
      const list = await repo.list();
      // 保留完整列表，展示时再按最近更新截取（避免先截断导致顺序错乱）
      setProjects(list);
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
      invalidateClientAuthCache();
      setEmail(null);
      onTip?.(t("common.logout"));
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
    onTip?.(t("studio.syncingCloud"));
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

  const others = takeRecentProjects(
    projects,
    RECENT_PROJECTS_LIMIT,
    currentProjectId,
  );
  const loginHref = `/?mode=register&next=${encodeURIComponent(`/project/${currentProjectId}/studio`)}`;
  const showGuestHint = ready && configured && !email;
  const displayTitle = projectTitle?.trim() || t("common.unnamed");
  const guestBarTitle = t("guest.registerGift", { n: FREE_MONTHLY_AI_GIFT });

  const overlayOpen = menuOpen || accountMenuOpen;

  return (
    <div
      className={`relative flex shrink-0 items-center gap-2 overflow-visible border-b border-border bg-surface px-3 py-1.5 ${
        overlayOpen ? "z-[80]" : "z-40"
      }`}
    >
      <BrandMark
        href="/"
        variant="short"
        nameClassName="hidden text-sm leading-none sm:inline"
        iconClassName="h-6 w-6"
        className="shrink-0"
      />
      <div className="relative min-w-0 shrink overflow-visible" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex max-w-[10rem] items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-left hover:bg-brand-soft sm:max-w-[14rem]"
          title={t("studio.switchProject")}
          aria-expanded={menuOpen}
        >
          <span className="truncate text-sm font-semibold text-foreground">
            {displayTitle}
          </span>
          <span className="shrink-0 text-[10px] text-muted">
            {menuOpen ? "▴" : "▾"}
          </span>
        </button>
        {menuOpen && (
          <div className="absolute left-0 top-full z-[60] mt-1 w-64 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface shadow-lg">
            <p className="border-b border-border bg-background px-3 py-1.5 text-[10px] font-medium text-muted">
              {t("auth.recent", { n: RECENT_PROJECTS_LIMIT })}
            </p>
            <ul className="max-h-56 overflow-y-auto py-1">
              <li>
                <span className="block truncate bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-dark">
                  {displayTitle}
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
                    className="block truncate px-3 py-1.5 text-xs text-foreground hover:bg-brand-soft hover:text-brand"
                    onClick={() => setMenuOpen(false)}
                    title={p.title}
                  >
                    {shortProjectTitle(p.title, 18)}
                  </Link>
                </li>
              ))}
              {others.length === 0 && (
                <li className="px-3 py-1.5 text-[11px] text-muted">
                  {t("projects.empty")}
                </li>
              )}
            </ul>
            <Link
              href="/projects"
              className="block border-t border-border px-3 py-2 text-xs font-medium text-brand hover:bg-brand-soft"
              onClick={() => setMenuOpen(false)}
            >
              {t("studio.openLibrary")}
            </Link>
          </div>
        )}
      </div>

      {showGuestHint ? (
        <p
          className="hidden min-w-0 flex-1 truncate text-[11px] text-amber-800/90 md:block"
          title={guestBarTitle}
        >
          {t("studio.guestTip")}
        </p>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <LocaleSwitcher />
        {/* 同步 + 自动：合并成一个控件，少占宽度 */}
        <div
          className={`inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border ${
            syncMode === "auto"
              ? "border-brand-light bg-brand-soft"
              : "border-border bg-surface"
          }`}
          title={
            syncMode === "auto"
              ? t("projects.syncLabelAuto")
              : t("projects.syncLabelManual")
          }
        >
          <button
            type="button"
            disabled={syncBusy || !ready}
            onClick={() => void handleSync()}
            className={`px-2 py-1 text-[11px] font-medium disabled:opacity-50 ${
              syncMode === "auto"
                ? "text-brand-dark hover:bg-brand-light/40"
                : "text-foreground hover:bg-background"
            }`}
          >
            {syncBusy ? `${t("studio.sync")}…` : t("studio.sync")}
          </button>
          <span
            className={`h-4 w-px shrink-0 ${
              syncMode === "auto" ? "bg-brand-light" : "bg-border"
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
                  ? t("projects.syncAutoTip")
                  : t("projects.syncManualTip"),
              );
            }}
            className={`flex items-center gap-1.5 px-2 py-1 text-[11px] disabled:opacity-50 ${
              syncMode === "auto"
                ? "text-brand-dark hover:bg-brand-light/40"
                : "text-muted hover:bg-background"
            }`}
          >
            <span
              className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition ${
                syncMode === "auto" ? "bg-brand" : "bg-zinc-300"
              }`}
              aria-hidden
            >
              <span
                className={`absolute h-2.5 w-2.5 rounded-full bg-white shadow transition ${
                  syncMode === "auto" ? "left-[11px]" : "left-0.5"
                }`}
              />
            </span>
            <span className="font-medium">{t("studio.autoSync")}</span>
          </button>
        </div>

        {!ready ? (
          <span className="px-1 text-[11px] text-muted">…</span>
        ) : !configured ? (
          <span className="hidden text-[11px] text-muted sm:inline">
            {t("studio.localMode")}
          </span>
        ) : email ? (
          <StudioAccountChip
            email={email}
            authBusy={authBusy}
            onSignOut={() => void handleSignOut()}
            onTip={onTip}
            onOpenChange={setAccountMenuOpen}
          />
        ) : (
          <Link
            href={loginHref}
            className="pf-btn-primary px-2.5 py-1 text-[11px]"
            title={guestBarTitle}
          >
            {t("guest.cta")}
          </Link>
        )}
      </div>
    </div>
  );
}
