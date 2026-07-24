"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import SyncPreferenceControls from "@/components/account/SyncPreferenceControls";
import GuestRegisterNudge from "@/components/auth/GuestRegisterNudge";
import ProjectThumb from "@/components/projects/ProjectThumb";
import { FREE_MONTHLY_AI_GIFT } from "@/lib/ai/login-gate";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import { resolveProjectRepository } from "@/lib/project/repository";
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
import {
  LIBRARY_PAGE_SIZE,
  LIBRARY_UNCATEGORIZED,
  collectLibraryCategories,
  formatProjectDateTime,
  getProjectLibraryCategory,
  getProjectThumbRef,
  shortProjectTitle,
  studioHrefForProject,
} from "@/lib/project/library-display";

type WorkflowFilter = "all" | "draft" | "in_review" | "finalized";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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
  const [customCategory, setCustomCategory] = useState("");

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

  const categories = useMemo(
    () => collectLibraryCategories(projects),
    [projects],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) =>
        workflowFilter === "all" ? true : p.workflowStatus === workflowFilter,
      )
      .filter((p) => {
        if (categoryFilter === "all") return true;
        return getProjectLibraryCategory(p) === categoryFilter;
      })
      .filter((p) => {
        if (!q) return true;
        const title = (p.title || "").toLowerCase();
        const cat = getProjectLibraryCategory(p).toLowerCase();
        const style = (p.styleNo || "").toLowerCase();
        return title.includes(q) || cat.includes(q) || style.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [projects, workflowFilter, categoryFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIBRARY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * LIBRARY_PAGE_SIZE,
    safePage * LIBRARY_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [workflowFilter, categoryFilter, query]);

  const cacheBytes =
    stats.trainingBytes + stats.meterBytes + stats.telemetryBytes;

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
    setCacheNote(
      `已导出质量日志（${listAiMeterEvents().length} 条用量记录仍在本地）`,
    );
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

  const handleSetCategory = async (id: string, category: string) => {
    const current = projects.find((p) => p.id === id);
    if (!current) return;
    const nextCat = category.trim();
    const updated: TechPackProject = {
      ...current,
      updatedAt: new Date().toISOString(),
      intake: {
        ...current.intake,
        libraryCategory:
          !nextCat || nextCat === LIBRARY_UNCATEGORIZED
            ? undefined
            : nextCat,
      },
    };
    try {
      const repo = await resolveProjectRepository();
      await repo.save(updated);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setCacheNote(
        `已将「${shortProjectTitle(current.title)}」分到「${
          nextCat || LIBRARY_UNCATEGORIZED
        }」`,
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "分类保存失败");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">项目库</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {cloudLoggedIn
                ? `云端 + 本机 · 共 ${projects.length} 个 · 约占 ${formatStorageBytes(stats.totalBytes)}`
                : `本机保存 · 共 ${projects.length} 个 · 约占 ${formatStorageBytes(stats.totalBytes)}`}
              {" · "}
              相册式浏览，可分类、删除、分页
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + 新建款式
          </Link>
        </div>

        <details className="mb-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-800">
            本机存储与备份（点击展开）
          </summary>
          <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-500">
            <li>
              项目数据 {formatStorageBytes(stats.projectsBytes)} · 视角缓存{" "}
              {formatStorageBytes(stats.trainingBytes)} · AI 用量{" "}
              {formatStorageBytes(stats.meterBytes)} · 质量日志{" "}
              {formatStorageBytes(stats.telemetryBytes)}
            </li>
            <li>
              本期本地 AI 成功调用约 {aiUnits} 次
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
              导出质量日志
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
        </details>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-950">
          <p className="font-medium">云端同步</p>
          <p className="mt-1 text-[11px] leading-relaxed text-blue-900/80">
            {cloudLoggedIn
              ? syncMode === "auto"
                ? "当前：自动同步。登录与保存时会尽量传到云端。"
                : "当前：手动同步。保存只写本机，需要时再点下方按钮。"
              : `未登录：稿在本机浏览器。注册免费，每月送 ${FREE_MONTHLY_AI_GIFT} 点 AI，还能同步到云端。`}
          </p>
          {cloudLoggedIn ? (
            <div className="mt-2">
              <SyncPreferenceControls
                onChanged={(_m, msg) => setCacheNote(msg)}
              />
            </div>
          ) : (
            <div className="mt-2">
              <GuestRegisterNudge next="/projects" />
            </div>
          )}
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
                已有账号？去登录
              </Link>
            )}
          </div>
          {syncStatus && !syncStatus.ok ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              {syncStatus.message}
            </p>
          ) : null}
        </div>

        {cacheNote ? (
          <p className="mb-3 text-xs text-emerald-700">{cacheNote}</p>
        ) : null}

        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题 / 分类 / 款号"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none ring-blue-200 focus:ring-2 sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-zinc-500">分类</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700"
            >
              <option value="all">全部分类</option>
              <option value={LIBRARY_UNCATEGORIZED}>
                {LIBRARY_UNCATEGORIZED}
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "全部状态"],
              ["draft", "草稿"],
              ["in_review", "审核中"],
              ["finalized", "已定稿"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setWorkflowFilter(key)}
              className={`rounded-full px-3 py-1 text-xs ${
                workflowFilter === key
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center text-sm text-zinc-400">
            没有符合条件的项目。{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              去新建款式
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {pageItems.map((p) => {
                const cat = getProjectLibraryCategory(p);
                const href = studioHrefForProject(p);
                return (
                  <article
                    key={p.id}
                    className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow"
                  >
                    <Link href={href} className="block">
                      <div className="aspect-[4/5] overflow-hidden bg-slate-50">
                        <ProjectThumb
                          imageRef={getProjectThumbRef(p)}
                          title={p.title}
                          className="h-full w-full transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="space-y-1 px-3 pb-2 pt-2.5">
                        <p
                          className="truncate text-sm font-semibold text-zinc-900"
                          title={p.title}
                        >
                          {shortProjectTitle(p.title, 18)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {cat} · {WORKFLOW_LABELS[p.workflowStatus] ?? p.workflowStatus}{" "}
                          · {calcProgress(p)}%
                        </p>
                        <p className="text-[10px] leading-relaxed text-zinc-400">
                          建于 {formatProjectDateTime(p.createdAt)}
                          <br />
                          更新 {formatProjectDateTime(p.updatedAt)}
                        </p>
                      </div>
                    </Link>
                    <div className="flex flex-wrap items-center gap-1 border-t border-zinc-100 px-2 py-2">
                      <select
                        aria-label="设置分类"
                        value={cat}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__custom__") {
                            const name = window.prompt(
                              "输入新分类名称",
                              customCategory || "",
                            );
                            if (name?.trim()) {
                              setCustomCategory(name.trim());
                              void handleSetCategory(p.id, name.trim());
                            }
                            return;
                          }
                          void handleSetCategory(p.id, v);
                        }}
                        className="max-w-[7rem] flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-[10px] text-zinc-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value={LIBRARY_UNCATEGORIZED}>
                          {LIBRARY_UNCATEGORIZED}
                        </option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__custom__">+ 新建分类…</option>
                      </select>
                      <button
                        type="button"
                        title="备份"
                        onClick={() => void handleExportBackup(p.id, p.title)}
                        className="rounded px-1.5 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100"
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
                        className="rounded px-1.5 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100"
                      >
                        复制
                      </button>
                      <button
                        type="button"
                        title="删除"
                        onClick={() => {
                          if (
                            window.confirm(
                              `确定删除「${p.title || "未命名"}」？删除后不可恢复。`,
                            )
                          ) {
                            void (async () => {
                              const repo = await resolveProjectRepository();
                              await repo.delete(p.id);
                              refresh();
                            })();
                          }
                        }}
                        className="rounded px-1.5 py-1 text-[10px] text-rose-500 hover:bg-rose-50"
                      >
                        删除
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <p>
                共 {filtered.length} 个 · 第 {safePage} / {totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
