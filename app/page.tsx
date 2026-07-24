"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NewStyleEntryCard, {
  CanvasGridBackground,
  type NewStyleMode,
} from "@/components/studio/NewStyleEntryCard";
import GuestRegisterNudge from "@/components/auth/GuestRegisterNudge";
import BrandFooter from "@/components/brand/BrandFooter";
import { BRAND_NAME } from "@/lib/brand";
import Link from "next/link";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { listProjects } from "@/lib/project/storage";
import { resolveProjectRepository } from "@/lib/project/repository";
import type { TechPackProject } from "@/types/project";
import {
  FREE_MONTHLY_AI_GIFT,
  LOGIN_CTA_LABEL,
  REGISTER_CTA_LABEL,
  buildLoginHref,
} from "@/lib/ai/login-gate";
import {
  RECENT_PROJECTS_LIMIT,
  shortProjectTitle,
  studioHrefForProject,
} from "@/lib/project/library-display";

/** 首页：空白画布 + 引导；登录后显示最近项目；不自动打开旧款 */
export default function CanvasHomePage() {
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

  const handleCreated = (projectId: string, mode: NewStyleMode) => {
    setNewOpen(false);
    router.push(
      mode === "full"
        ? `/project/${projectId}/studio?fullCollect=1`
        : `/project/${projectId}/studio`,
    );
  };

  const handleCreatedNeedLogin = (
    projectId: string,
    authMode: "login" | "register",
  ) => {
    setNewOpen(false);
    router.push(
      buildLoginHref({
        mode: authMode,
        next: `/project/${projectId}/studio`,
      }),
    );
  };

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#ececec] text-sm text-slate-500">
        正在进入画布…
      </div>
    );
  }

  const loggedIn = Boolean(email);
  const recent = loggedIn ? projects.slice(0, RECENT_PROJECTS_LIMIT) : [];

  return (
    <div className="relative h-screen overflow-hidden">
      <CanvasGridBackground />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4 pb-20">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-7 text-center shadow-sm backdrop-blur">
          <p className="text-lg font-semibold tracking-tight text-slate-800">
            {BRAND_NAME}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            上传款式图后可先手动标注工艺与尺寸，再导出给版师。
            要用 AI（一键标注、生图）或把稿存到云端，注册即可——免费送每月{" "}
            {FREE_MONTHLY_AI_GIFT} 点 AI。
          </p>

          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-left text-[11px] leading-relaxed text-slate-600">
            <p className="font-medium text-slate-700">怎么开始</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>点「新建款式」上传正面图</li>
              <li>在画布里用方框/尺寸线/表格手动标注</li>
              <li>
                需要 AI 或云端存档时，注册领取每月 {FREE_MONTHLY_AI_GIFT} 点
              </li>
            </ol>
          </div>

          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            新建款式
          </button>

          {configured && !loggedIn ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link
                  href={buildLoginHref({ mode: "register", next: "/" })}
                  className="flex min-h-11 items-center justify-center rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  {REGISTER_CTA_LABEL}
                </Link>
                <Link
                  href={buildLoginHref({ mode: "login", next: "/" })}
                  className="flex min-h-11 items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  {LOGIN_CTA_LABEL}
                </Link>
              </div>
              <GuestRegisterNudge next="/" showCta={false} />
            </div>
          ) : null}

          {loggedIn ? (
            <div className="mt-5 border-t border-slate-100 pt-4 text-left">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-500">
                  最近更新（{RECENT_PROJECTS_LIMIT} 个）
                </p>
                <Link
                  href="/projects"
                  className="text-[11px] font-medium text-blue-600 hover:underline"
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
                        className="block truncate rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        title={p.title}
                      >
                        {shortProjectTitle(p.title, 20)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
                  还没有项目。点上方「新建款式」开始；若已在其它设备做过，打开「查看全部项目」点「从云端拉取」。
                </p>
              )}
            </div>
          ) : null}

          {!configured ? (
            <p className="mt-4 text-[11px] leading-relaxed text-amber-700">
              当前是本机模式（未配置云端）。可先新建并手动标注；配好云端并注册后才能用 AI 与同步存档。
            </p>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 pt-2">
        <BrandFooter />
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
