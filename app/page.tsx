"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NewStyleEntryCard, {
  CanvasGridBackground,
  type NewStyleMode,
} from "@/components/studio/NewStyleEntryCard";
import AuthHeaderControls from "@/components/auth/AuthHeaderControls";
import Link from "next/link";
import { listProjects } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

function studioHref(p: { id: string; status: string }) {
  return p.status === "collecting"
    ? `/project/${p.id}/studio?fullCollect=1`
    : `/project/${p.id}/studio`;
}

/** 首页：始终空白画布壳；不自动打开最近项目，需用户点选或新建 */
export default function CanvasHomePage() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listProjects()
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        setBooting(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setBooting(false);
      });
    return () => {
      cancelled = true;
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

  const recent = projects.slice(0, 6);

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
          <Link
            href="/projects"
            className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur hover:text-blue-600"
          >
            我的项目
          </Link>
          <div className="rounded-lg bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
            <AuthHeaderControls />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-4 pt-16">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-8 text-center shadow-sm backdrop-blur">
          <p className="text-base font-semibold text-slate-800">空白画布</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {projects.length > 0
              ? "不会自动打开旧款。请选择下方项目，或新建一款。"
              : "还没有款式。点下方新建，上传图片后再进画布编辑。"}
          </p>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            新建款式
          </button>

          {recent.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-4 text-left">
              <p className="mb-2 text-[11px] font-medium text-slate-500">
                选择已有项目
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
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
              {projects.length > recent.length ? (
                <Link
                  href="/projects"
                  className="mt-2 inline-block text-[11px] text-blue-600 hover:underline"
                >
                  查看全部项目 →
                </Link>
              ) : null}
            </div>
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
