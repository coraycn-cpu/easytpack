"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NewStyleEntryCard, {
  CanvasGridBackground,
  type NewStyleMode,
} from "@/components/studio/NewStyleEntryCard";
import AuthHeaderControls from "@/components/auth/AuthHeaderControls";
import Link from "next/link";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { listProjects } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

function studioHref(p: { id: string; status: string }) {
  return p.status === "collecting"
    ? `/project/${p.id}/studio?fullCollect=1`
    : `/project/${p.id}/studio`;
}

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
        const list = await listProjects();
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([]);
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

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#ececec] text-sm text-slate-500">
        正在进入画布…
      </div>
    );
  }

  const loggedIn = Boolean(email);
  const recent = loggedIn ? projects.slice(0, 6) : [];

  return (
    <div className="relative h-screen overflow-hidden">
      <CanvasGridBackground />
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
        <Link
          href="/"
          className="pointer-events-auto rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur"
        >
          EasytPack
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          {loggedIn ? (
            <Link
              href="/projects"
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur hover:text-blue-600"
            >
              我的项目
            </Link>
          ) : null}
          <div className="rounded-lg bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
            <AuthHeaderControls />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4 pt-16 pb-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-7 text-center shadow-sm backdrop-blur">
          <p className="text-lg font-semibold text-slate-800">空白画布</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            上传款式图，用 AI 标工艺、补尺寸，再导出给版师。未登录也能本机做款；登录后可同步到网上、换设备继续。
          </p>

          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-left text-[11px] leading-relaxed text-slate-600">
            <p className="font-medium text-slate-700">怎么开始</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>点「新建款式」上传正面图</li>
              <li>在画布里标注工艺 / 尺寸，或用 AI 一键生成</li>
              <li>左侧可生成背面、领口等视角；顶栏可同步到网上</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            新建款式
          </button>

          {configured && !loggedIn ? (
            <div className="mt-4 flex gap-2">
              <Link
                href="/login?next=/"
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                登录
              </Link>
              <Link
                href="/login?mode=register&next=/"
                className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                注册
              </Link>
            </div>
          ) : null}

          {configured && !loggedIn ? (
            <p className="mt-3 text-[11px] text-slate-400">
              登录后这里会显示你的最近项目。
            </p>
          ) : null}

          {loggedIn ? (
            <div className="mt-5 border-t border-slate-100 pt-4 text-left">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-500">
                  最近项目
                </p>
                <Link
                  href="/projects"
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  全部 →
                </Link>
              </div>
              {recent.length > 0 ? (
                <ul className="max-h-44 space-y-1 overflow-y-auto">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={studioHref(p)}
                        className="block truncate rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {p.title?.trim() || "未命名款式"}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
                  还没有项目。点上方「新建款式」开始；若已在其它设备做过，可先点顶栏「同步」或打开「我的项目」。
                </p>
              )}
            </div>
          ) : null}

          {!configured ? (
            <p className="mt-4 text-[11px] leading-relaxed text-amber-700">
              当前是本机模式（未配置云端）。可先新建做款；配好云端后再登录同步。
            </p>
          ) : null}
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
            <NewStyleEntryCard variant="overlay" onCreated={handleCreated} />
          </div>
        </div>
      )}
    </div>
  );
}
