"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import {
  deleteProject,
  duplicateProject,
  evacuateNonProjectStorage,
  exportProjectJsonBackup,
  formatStorageBytes,
  getEasytpackStorageStats,
  getProject,
  listProjects,
} from "@/lib/project/storage";
import {
  downloadTextFile,
  exportAiTelemetryJsonl,
  getAiTelemetryStorageBytes,
} from "@/lib/ai/telemetry";
import { listAiMeterEvents, sumAiMeterUnits } from "@/lib/ai/metering";
import {
  isLoggedInForCloud,
  pushAllLocalProjectsToCloud,
} from "@/lib/project/cloud-sync";
import type { TechPackProject } from "@/types/project";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "in_review" | "finalized">("all");
  const [stats, setStats] = useState(() => ({
    projectsBytes: 0,
    trainingBytes: 0,
    meterBytes: 0,
    telemetryBytes: 0,
    totalBytes: 0,
    projectCount: 0,
  }));
  const [cacheNote, setCacheNote] = useState<string | null>(null);
  const [aiUnits, setAiUnits] = useState(0);
  const [cloudLoggedIn, setCloudLoggedIn] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const refresh = () => {
    void listProjects().then(setProjects);
    setStats(getEasytpackStorageStats());
    setAiUnits(sumAiMeterUnits());
    void isLoggedInForCloud().then(setCloudLoggedIn);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = projects.filter((p) =>
    filter === "all" ? true : p.workflowStatus === filter,
  );

  const cacheBytes =
    stats.trainingBytes + stats.meterBytes + stats.telemetryBytes;

  const getHref = (p: TechPackProject) => {
    if (p.status === "collecting")
      return `/project/${p.id}/studio?fullCollect=1`;
    if (p.status === "studio" || p.status === "completed")
      return `/project/${p.id}/studio`;
    return `/project/${p.id}/studio?fullCollect=1`;
  };

  const handleClearCache = () => {
    evacuateNonProjectStorage();
    setCacheNote("已清理视角缓存、用量与质量日志；项目未删除");
    refresh();
  };

  const handleSyncCloud = () => {
    setSyncBusy(true);
    void pushAllLocalProjectsToCloud(projects)
      .then((res) => {
        setCacheNote(res.message);
        refresh();
      })
      .finally(() => setSyncBusy(false));
  };

  const handleExportBackup = async (id: string, title: string) => {
    try {
      const p = await getProject(id);
      if (!p) {
        window.alert("项目不存在或已删除");
        return;
      }
      const json = exportProjectJsonBackup(p);
      const safe = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40) || "project";
      downloadTextFile(`${safe}-backup.json`, json);
      setCacheNote(`已导出「${title}」JSON 备份（图片若为 idb 引用需本机还原）`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "导出失败");
    }
  };

  const handleExportTelemetry = () => {
    const jsonl = exportAiTelemetryJsonl();
    if (!jsonl.trim()) {
      setCacheNote("暂无质量日志可导出");
      return;
    }
    downloadTextFile(
      `easytpack-ai-telemetry-${new Date().toISOString().slice(0, 10)}.jsonl`,
      jsonl,
    );
    setCacheNote(`已导出质量日志（${listAiMeterEvents().length} 条用量记录仍在本地）`);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">我的项目</h1>
            <p className="mt-1 text-sm text-zinc-500">
              本地保存，共 {projects.length} 个款式 · 约占{" "}
              {formatStorageBytes(stats.totalBytes)}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + 新建
          </Link>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
          <p className="font-medium text-zinc-800">本机存储</p>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-zinc-500">
            <li>
              项目数据 {formatStorageBytes(stats.projectsBytes)} · 视角缓存{" "}
              {formatStorageBytes(stats.trainingBytes)} · AI 用量{" "}
              {formatStorageBytes(stats.meterBytes)} · 质量日志{" "}
              {formatStorageBytes(stats.telemetryBytes)}
            </li>
            <li>
              本期本地 AI 成功调用约 {aiUnits} 次（下期接订阅额度）
              {getAiTelemetryStorageBytes() > 0
                ? ` · 质量日志 ${formatStorageBytes(getAiTelemetryStorageBytes())}`
                : ""}
            </li>
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={cacheBytes === 0}
              onClick={handleClearCache}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              清理缓存
              {cacheBytes > 0 ? `（约 ${formatStorageBytes(cacheBytes)}）` : ""}
            </button>
            <button
              type="button"
              onClick={handleExportTelemetry}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
            >
              导出质量日志 JSONL
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
            保存失败或提示空间已满时：删除旧款、清理缓存，或导出 JSON
            备份后再删。大图会自动压缩。
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-950">
          <p className="font-medium">云端同步</p>
          <p className="mt-1 text-[11px] leading-relaxed text-blue-900/80">
            {cloudLoggedIn
              ? "已登录：保存或点「同步」会把项目和图片尽量传到网上。"
              : "未登录：项目只存在当前浏览器。登录后可同步到云端。"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cloudLoggedIn ? (
              <button
                type="button"
                disabled={syncBusy}
                onClick={handleSyncCloud}
                className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100 disabled:opacity-40"
              >
                {syncBusy ? "同步中…" : "把本机项目同步到云端"}
              </button>
            ) : (
              <Link
                href="/login?next=/projects"
                className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100"
              >
                去登录
              </Link>
            )}
          </div>
        </div>

        {cacheNote && (
          <p className="mb-3 text-xs text-emerald-700">{cacheNote}</p>
        )}

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
                <Link href={getHref(p)} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">{p.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {p.intake.detectedCategory ?? "未分类"} ·{" "}
                    {WORKFLOW_LABELS[p.workflowStatus]} · {calcProgress(p)}%
                  </p>
                </Link>
                <div className="ml-3 flex shrink-0 gap-1">
                  <button
                    type="button"
                    title="导出 JSON 备份"
                    onClick={() => void handleExportBackup(p.id, p.title)}
                    className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100"
                  >
                    备份
                  </button>
                  <button
                    type="button"
                    title="复制"
                    onClick={() => {
                      void (async () => {
                        try {
                          const copy = await duplicateProject(p.id);
                          if (copy) {
                            refresh();
                            router.push(`/project/${copy.id}/studio`);
                          }
                        } catch (e) {
                          window.alert(
                            e instanceof Error
                              ? e.message
                              : "复制失败，本地空间可能已满",
                          );
                          refresh();
                        }
                      })();
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
                        void deleteProject(p.id).then(() => refresh());
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
