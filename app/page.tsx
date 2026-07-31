"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NewStyleEntryCard, {
  CanvasGridBackground,
} from "@/components/studio/NewStyleEntryCard";
import AuthEntryPanel from "@/components/auth/AuthEntryPanel";
import BrandFooter from "@/components/brand/BrandFooter";
import BrandMark from "@/components/brand/BrandMark";
import BusyOverlay from "@/components/ui/BusyOverlay";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { listProjects } from "@/lib/project/storage";
import { resolveProjectRepository } from "@/lib/project/repository";
import type { TechPackProject } from "@/types/project";
import {
  FREE_MONTHLY_AI_GIFT,
  HOME_AI_QUOTA_HINT,
  buildLoginHref,
} from "@/lib/ai/login-gate";
import { BRAND_NAME, BRAND_SLOGAN } from "@/lib/brand";
import {
  RECENT_PROJECTS_LIMIT,
  shortProjectTitle,
  studioHrefForProject,
  takeRecentProjects,
} from "@/lib/project/library-display";

/**
 * 合并后的进站页：左介绍 + 右登录/注册（或已登录欢迎）+ 新建款式。
 * 登录/注册业务逻辑不变；原独立登录页会跳转到这里。
 */
export default function HomeEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-background">
          <BusyOverlay title="正在进入…" subtitle="请稍候" />
        </div>
      }
    >
      <HomeEntryInner />
    </Suspense>
  );
}

function HomeEntryInner() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ok = isSupabaseConfigured();
    setConfigured(ok);

    const loadProjects = async () => {
      try {
        const repo = await resolveProjectRepository();
        const list = await repo.list();
        if (!cancelled) setProjects(list);
      } catch {
        try {
          const list = await listProjects();
          if (!cancelled) setProjects(list);
        } catch {
          if (!cancelled) setProjects([]);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    if (!ok) {
      void loadProjects();
      return () => {
        cancelled = true;
      };
    }

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      void loadProjects();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setEmail(session?.user?.email ?? null);
      void loadProjects();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleCreated = (projectId: string) => {
    setNewOpen(false);
    router.push(`/project/${projectId}/studio`);
  };

  const handleCreatedNeedLogin = (
    projectId: string,
    authMode: "login" | "register",
  ) => {
    setNewOpen(false);
    router.push(
      buildLoginHref({
        mode: authMode,
        next: `/project/${projectId}/studio?pendingAi=1`,
      }),
    );
  };

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted">
        正在进入…
      </div>
    );
  }

  const loggedIn = Boolean(email);
  const recent = loggedIn
    ? takeRecentProjects(projects, RECENT_PROJECTS_LIMIT)
    : [];

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <CanvasGridBackground />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col">
        <div className="flex flex-1 flex-col lg:flex-row">
        {/* 左侧品牌介绍 */}
        <section className="relative flex flex-1 flex-col justify-center px-6 pb-4 pt-10 lg:px-12 lg:pb-6 lg:pt-16">
          <BrandMark
            href={false}
            nameClassName="max-w-md text-base leading-snug sm:text-lg"
            iconClassName="h-8 w-8"
          />
          <h1 className="mt-8 max-w-lg text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {BRAND_NAME}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            {BRAND_SLOGAN}
            。从款式图到可沟通的工艺包，注册后还能云端存档、换设备继续。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
                aria-hidden
              >
                ★
              </span>
              <span>
                <strong className="font-semibold text-foreground">速度快</strong>
                {" — "}几分钟内完成标注与导出准备
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
                aria-hidden
              >
                ✦
              </span>
              <span>
                <strong className="font-semibold text-foreground">AI 辅助</strong>
                {" — "}一键标注、生图、补全（注册后每月送{" "}
                {FREE_MONTHLY_AI_GIFT} 点）
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
                aria-hidden
              >
                ▤
              </span>
              <span>
                <strong className="font-semibold text-foreground">可交付</strong>
                {" — "}导出给版师沟通用的工艺包预览
              </span>
            </li>
          </ul>
          <p className="mt-5 max-w-md rounded-[var(--radius-sm)] border border-brand/20 bg-brand-soft/50 px-3 py-2.5 text-[12px] leading-relaxed text-foreground">
            {HOME_AI_QUOTA_HINT}
          </p>
          <div className="mt-5 rounded-[var(--radius-sm)] bg-brand-soft/70 px-3 py-3 text-left text-[11px] leading-relaxed text-muted lg:max-w-md">
            <p className="font-medium text-foreground">怎么开始</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>点右侧「新建款式」上传正面图</li>
              <li>在画布里用方框/尺寸线/表格手动标注</li>
              <li>
                需要 AI 或云端存档时，注册领取每月 {FREE_MONTHLY_AI_GIFT} 点
              </li>
            </ol>
          </div>
        </section>

        {/* 右侧：登录/注册 或 已登录 + 新建款式 */}
        <section className="flex flex-1 items-center justify-center px-4 py-8 lg:px-10 lg:pb-6 lg:pt-16">
          <div className="pf-card w-full max-w-md space-y-5 bg-white/95 p-6 backdrop-blur sm:p-8">
            {loggedIn ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    欢迎回来
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted" title={email ?? undefined}>
                    {email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewOpen(true)}
                  className="pf-btn-primary w-full py-3 text-[15px]"
                >
                  + 新建款式
                </button>
                <div className="border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-muted">
                      最近更新（{RECENT_PROJECTS_LIMIT} 个）
                    </p>
                    <Link
                      href="/projects"
                      className="pf-btn-text text-[11px] font-medium"
                    >
                      查看全部项目 →
                    </Link>
                  </div>
                  {recent.length > 0 ? (
                    <ul className="max-h-44 space-y-1 overflow-y-auto">
                      {recent.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={studioHrefForProject(p)}
                            className="block truncate rounded-[var(--radius-sm)] px-2.5 py-2 text-xs text-foreground hover:bg-brand-soft hover:text-brand"
                            title={p.title}
                          >
                            {shortProjectTitle(p.title, 20)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-[var(--radius-sm)] bg-background px-3 py-3 text-[11px] text-muted">
                      还没有项目。点上方「新建款式」开始；若已在其它设备做过，打开「查看全部项目」点「从云端拉取」。
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link href="/projects" className="pf-btn-secondary px-3 py-1.5">
                    项目库
                  </Link>
                  <Link href="/account" className="pf-btn-secondary px-3 py-1.5">
                    用户中心
                  </Link>
                </div>
              </>
            ) : (
              <>
                <AuthEntryPanel defaultNext="/" />
                <div className="border-t border-border pt-5">
                  <p className="mb-2 text-center text-[11px] text-muted">
                    也可以先不登录，直接手动标注
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewOpen(true)}
                    className="pf-btn-secondary w-full py-3 text-[15px]"
                  >
                    + 新建款式
                  </button>
                </div>
                {!configured ? (
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    当前是本机模式（未配置云端）。可先新建并手动标注；配好云端并注册后才能用
                    AI 与同步存档。
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>
        </div>

        <div className="relative z-20 px-4 pb-8 pt-2 lg:pb-10">
          <BrandFooter />
        </div>
      </div>

      {newOpen && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[1px]">
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow hover:text-slate-800"
              aria-label="关闭"
            >
              ×
            </button>
            <NewStyleEntryCard
              variant="overlay"
              onCreated={handleCreated}
              onCreatedNeedLogin={handleCreatedNeedLogin}
            />
          </div>
        </div>
      )}
    </div>
  );
}
