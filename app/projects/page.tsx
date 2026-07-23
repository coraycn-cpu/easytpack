"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import SyncPreferenceControls from "@/components/account/SyncPreferenceControls";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import {
  duplicateProject,
  evacuateNonProjectStorage,
  exportProjectJsonBackup,
  formatStorageBytes,
  getEasytpackStorageStats,
  importProjectJsonBackup,
} from "@/lib/project/storage";
import {
  downloadTextFile,
  exportAiTelemetryJsonl,
  getAiTelemetryStorageBytes,
} from "@/lib/ai/telemetry";
import { listAiMeterEvents, sumAiMeterUnits } from "@/lib/ai/metering";
import {
  isLoggedInForCloud,
  pullAllFromCloudAndCache,
  pushAllLocalProjectsToCloud,
  syncAfterLogin,
} from "@/lib/project/cloud-sync";
import { resolveProjectRepository } from "@/lib/project/repository";
import {
  getCloudSyncMode,
  subscribeCloudSyncMode,
  type CloudSyncMode,
} from "@/lib/project/sync-preference";
import {
  getCloudSyncStatus,
  subscribeCloudSyncStatus,
  type CloudSyncStatus,
} from "@/lib/project/sync-status";
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
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [syncMode, setSyncMode] = useState<CloudSyncMode>("auto");
  const [importBusy, setImportBusy] = useState(false);

  const refresh = () => {
    void (async () => {
      const repo = await resolveProjectRepository();
      setProjects(await repo.list());
    })();
    setStats(getEasytpackStorageStats());
    setAiUnits(sumAiMeterUnits());
    void isLoggedInForCloud().then(setCloudLoggedIn);
    setSyncStatus(getCloudSyncStatus());
  };

  useEffect(() => {
    setSyncMode(getCloudSyncMode());
    refresh();
    const unsubStatus = subscribeCloudSyncStatus(setSyncStatus);
    const unsubMode = subscribeCloudSyncMode(setSyncMode);
    return () => {
      unsubStatus();
      unsubMode();
    };
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

  const handleSyncBoth = () => {
    setSyncBusy(true);
    void syncAfterLogin()
      .then((res) => {
        setCacheNote(res.message);
        refresh();
      })
      .finally(() => setSyncBusy(false));
  };

  const handlePull = () => {
    setSyncBusy(true);
    void pullAllFromCloudAndCache()
      .then((res) => {
        setCacheNote(res.message);
        refresh();
      })
      .finally(() => setSyncBusy(false));
  };

  const handlePush = () => {
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
      const repo = await resolveProjectRepository();
      const p = await repo.get(id);
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

  const handleImportBackup = async (file: File | null) => {
    if (!file || importBusy) return;
    setImportBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("文件过大（超过 20MB），请换较小备份或先压缩图片");
      }
      const text = await file.text();
      const result = await importProjectJsonBackup(text);
      refresh();
      const warn =
        result.warnings.length > 0
          ? `（注意：${result.warnings.join(" ")}）`
          : "";
      setCacheNote(`已恢复「${result.project.title}」${warn}`);
      if (
        window.confirm(
          `已恢复「${result.project.title}」。是否打开 Studio？${
            result.warnings[0] ? `\n\n${result.warnings[0]}` : ""
          }`,
        )
      ) {
        router.push(`/project/${result.project.id}/studio`);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "导入失败");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">我的项目</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {cloudLoggedIn
                ? `云端 + 本机缓存 · 共 ${projects.length} 个款式 · 约占 ${formatStorageBytes(stats.totalBytes)}`
                : `本机保存 · 共 ${projects.length} 个款式 · 约占 ${formatStorageBytes(stats.totalBytes)}`}
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
            <label className="cursor-pointer rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50">
              {importBusy ? "导入中…" : "导入 JSON 备份"}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={importBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void handleImportBackup(f);
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
            保存失败或提示空间已满时：删除旧款、清理缓存，或导出 JSON
            备份后再删。可用「导入 JSON 备份」恢复。大图会自动压缩。断网时仍可本机编辑，恢复网络后再同步。
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-950">
          <p className="font-medium">云端同步</p>
          <p className="mt-1 text-[11px] leading-relaxed text-blue-900/80">
            {cloudLoggedIn
              ? syncMode === "auto"
                ? "当前：自动同步。登录与保存时会尽量传到云端；也可手动点下方按钮。"
                : "当前：手动同步。保存只写本机，需要时再点下方按钮传到云端。"
              : "未登录：项目只存在当前浏览器。登录后可同步到云端、换设备继续。"}
          </p>

          {cloudLoggedIn ? (
            <div className="mt-2">
              <SyncPreferenceControls
                onChanged={(_m, msg) => setCacheNote(msg)}
              />
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            {cloudLoggedIn ? (
              <>
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={handleSyncBoth}
                  className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                >
                  {syncBusy ? "同步中…" : "双向同步"}
                </button>
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={handlePull}
                  className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                >
                  从云端拉取
                </button>
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={handlePush}
                  className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                >
                  推到云端
                </button>
              </>
            ) : (
              <Link
                href="/login?next=/projects"
                className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100"
              >
                去登录
              </Link>
            )}
          </div>
          {syncStatus && !syncStatus.ok ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              {syncStatus.message}
              {syncStatus.offlineHint
                ? " 本机稿件还在，恢复网络后点「双向同步」即可。"
                : ""}
            </p>
          ) : null}
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
                        void (async () => {
                          const repo = await resolveProjectRepository();
                          await repo.delete(p.id);
                          refresh();
                        })();
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
