"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import {
  deleteProject,
  duplicateProject,
  listProjects,
} from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "in_review" | "finalized">("all");

  useEffect(() => {
    setProjects(listProjects());
  }, []);

  const filtered = projects.filter((p) =>
    filter === "all" ? true : p.workflowStatus === filter,
  );

  const getHref = (p: TechPackProject) => {
    if (p.status === "collecting") return `/project/${p.id}/collect`;
    if (p.status === "studio" || p.status === "completed")
      return `/project/${p.id}/studio`;
    return `/project/${p.id}/collect`;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">我的项目</h1>
            <p className="mt-1 text-sm text-zinc-500">本地保存，共 {projects.length} 个款式</p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + 新建
          </Link>
        </div>

        <div className="mb-4 flex gap-2">
          {(
            [
              ["all", "全部"],
              ["draft", "草稿"],
              ["in_review", "审核中"],
              ["finalized", "已定稿"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === key ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center text-sm text-zinc-400">
            暂无项目，{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              开始制作第一个工艺包
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <Link href={getHref(p)} className="flex-1 min-w-0">
                  <p className="truncate font-medium text-zinc-900">{p.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {p.intake.detectedCategory ?? "未分类"} ·{" "}
                    {WORKFLOW_LABELS[p.workflowStatus]} · {calcProgress(p)}%
                  </p>
                </Link>
                <div className="ml-3 flex shrink-0 gap-1">
                  <button
                    type="button"
                    title="复制"
                    onClick={() => {
                      const copy = duplicateProject(p.id);
                      if (copy) {
                        setProjects(listProjects());
                        router.push(`/project/${copy.id}/studio`);
                      }
                    }}
                    className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100"
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    title="删除"
                    onClick={() => {
                      if (window.confirm(`确定删除「${p.title}」？`)) {
                        deleteProject(p.id);
                        setProjects(listProjects());
                      }
                    }}
                    className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
