"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { useLocale } from "@/components/i18n/LocaleProvider";
import SyncPreferenceControls from "@/components/account/SyncPreferenceControls";
import GuestRegisterNudge from "@/components/auth/GuestRegisterNudge";
import ProjectThumb from "@/components/projects/ProjectThumb";
import { FREE_MONTHLY_AI_GIFT } from "@/lib/ai/login-gate";
import { calcProgress, getWorkflowLabel } from "@/lib/project/progress";
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
  sortProjectsByUpdatedAtDesc,
  studioHrefForProject,
} from "@/lib/project/library-display";

type WorkflowFilter = "all" | "draft" | "in_review" | "finalized";

export default function ProjectsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [projects, setProjects] = useState<TechPackProject[]>([]);
  const [listReady, setListReady] = useState(false);
  const [cloudRefreshing, setCloudRefreshing] = useState(false);
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
  const [cloudLoggedIn, setCloudLoggedIn] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [syncMode, setSyncMode] = useState<CloudSyncMode>("auto");
  const [importBusy, setImportBusy] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const CAT_LABEL: Record<string, string> = {
    上衣: t("projects.catTops"),
    裤装: t("projects.catPants"),
    裙装: t("projects.catSkirts"),
    套装: t("projects.catSets"),
    外套: t("projects.catOuter"),
    配件: t("projects.catAccessories"),
    其它: t("projects.catOther"),
    未分类: t("common.uncategorized"),
  };

  const catLabel = (c: string) => CAT_LABEL[c] ?? c;

  const refresh = () => {
    void (async () => {
      const { listLocalProjectsOnly } = await import("@/lib/project/storage");
      const local = await listLocalProjectsOnly();
      setProjects(local);
      setListReady(true);

      const loggedIn = await isLoggedInForCloud();
      setCloudLoggedIn(loggedIn);
      if (!loggedIn) return;

      setCloudRefreshing(true);
      try {
        const { mergeLocalWithCloud } = await import("@/lib/project/cloud-sync");
        setProjects(await mergeLocalWithCloud(local));
      } finally {
        setCloudRefreshing(false);
      }
    })();
    setStats(getEasytpackStorageStats());
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
    const list = projects
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
        const catDisplay = catLabel(getProjectLibraryCategory(p)).toLowerCase();
        const style = (p.styleNo || "").toLowerCase();
        return (
          title.includes(q) ||
          cat.includes(q) ||
          catDisplay.includes(q) ||
          style.includes(q)
        );
      });
    return sortProjectsByUpdatedAtDesc(list);
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
    setCacheNote(t("projects.cacheCleared"));
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
        window.alert(t("projects.notFound"));
        return;
      }
      const json = exportProjectJsonBackup(p);
      const safe = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40) || "project";
      downloadTextFile(`${safe}-backup.json`, json);
      setCacheNote(`已导出「${title}」JSON 备份（图片若为 idb 引用需本机还原）`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t("projects.exportFail"));
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
    setCacheNote("已导出质量日志");
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
      window.alert(e instanceof Error ? e.message : t("projects.importFail"));
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
      const displayCat = catLabel(nextCat || LIBRARY_UNCATEGORIZED);
      setCacheNote(
        `已将「${shortProjectTitle(current.title)}」分到「${displayCat}」`,
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "分类保存失败");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("projects.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {cloudLoggedIn
                ? t("projects.subtitleCloudBytes", {
                    n: projects.length,
                    bytes: formatStorageBytes(stats.totalBytes),
                  })
                : t("projects.subtitleLocalBytes", {
                    n: projects.length,
                    bytes: formatStorageBytes(stats.totalBytes),
                  })}
              {" · "}
              {t("projects.albumHint")}
              {cloudRefreshing ? ` · ${t("projects.syncing")}` : ""}
            </p>
          </div>
          <Link
            href="/"
            className="pf-btn-primary shrink-0 px-4 py-2 text-sm"
          >
            {t("projects.newStyle")}
          </Link>
        </div>

        <details className="pf-card mb-4 px-4 py-3 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-foreground">
            {t("projects.localStorage")}
          </summary>
          <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-500">
            <li>
              {t("projects.storageBreakdown", {
                projects: formatStorageBytes(stats.projectsBytes),
                training: formatStorageBytes(stats.trainingBytes),
                meter: formatStorageBytes(stats.meterBytes),
                quality: formatStorageBytes(stats.telemetryBytes),
              })}
            </li>
            <li>
              {t("projects.quotaHint")}
              {getAiTelemetryStorageBytes() > 0
                ? ` · ${formatStorageBytes(getAiTelemetryStorageBytes())}`
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
              {t("projects.clearCache")}
              {cacheBytes > 0 ? `（${formatStorageBytes(cacheBytes)}）` : ""}
            </button>
            <button
              type="button"
              onClick={handleExportTelemetry}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
            >
              {t("projects.exportQualityLog")}
            </button>
            <label className="cursor-pointer rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50">
              {importBusy
                ? t("projects.importing")
                : t("projects.importBackup")}
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

        <div className="mb-4 rounded-[var(--radius-sm)] border border-brand-light bg-brand-soft px-4 py-3 text-xs text-foreground">
          <p className="font-medium text-brand-dark">{t("projects.cloudSync")}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {cloudLoggedIn
              ? syncMode === "auto"
                ? t("projects.syncAutoHint")
                : t("projects.syncManualHint")
              : t("projects.syncGuestHint", { n: FREE_MONTHLY_AI_GIFT })}
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
                  {syncBusy
                    ? t("projects.syncingBtn")
                    : t("projects.syncBoth")}
                </button>
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={handlePull}
                  className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                >
                  {t("projects.pullCloud")}
                </button>
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={handlePush}
                  className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                >
                  {t("projects.pushCloud")}
                </button>
              </>
            ) : (
              <Link
                href="/?mode=login&next=/projects"
                className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-800 hover:bg-blue-100"
              >
                {t("projects.goLogin")}
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

        <div className="pf-card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("projects.searchPh")}
            className="pf-input px-3 py-2 text-sm sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-muted">
              {t("projects.category")}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pf-input w-auto px-2 py-1.5 text-xs"
            >
              <option value="all">{t("projects.allCategories")}</option>
              <option value={LIBRARY_UNCATEGORIZED}>
                {t("common.uncategorized")}
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", t("projects.allStatus")],
              ["draft", t("common.draft")],
              ["in_review", t("common.inReview")],
              ["finalized", t("common.finalized")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setWorkflowFilter(key)}
              className={`rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium ${
                workflowFilter === key
                  ? "bg-brand text-white"
                  : "border border-border bg-surface text-muted hover:bg-brand-soft hover:text-brand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!listReady ? (
          <div className="pf-card border-dashed py-16 text-center text-sm text-muted">
            {t("projects.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pf-card border-dashed py-16 text-center text-sm text-muted">
            {t("projects.empty")}{" "}
            <Link href="/" className="pf-btn-text">
              {t("projects.goNew")}
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
                    className="pf-card group overflow-hidden transition hover:border-brand-light hover:shadow-md"
                  >
                    <Link href={href} className="block">
                      <div className="aspect-[4/5] overflow-hidden bg-background">
                        <ProjectThumb
                          imageRef={getProjectThumbRef(p)}
                          title={p.title}
                          className="h-full w-full transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="space-y-1 px-3 pb-2 pt-2.5">
                        <p
                          className="truncate text-sm font-semibold text-foreground"
                          title={p.title}
                        >
                          {shortProjectTitle(p.title, 18)}
                        </p>
                        <p className="text-[11px] text-muted">
                          {catLabel(cat)} ·{" "}
                          {getWorkflowLabel(p.workflowStatus, t)} ·{" "}
                          {calcProgress(p)}%
                        </p>
                        <p className="text-[10px] leading-relaxed text-zinc-400">
                          {t("projects.created")}{" "}
                          {formatProjectDateTime(p.createdAt)}
                          <br />
                          {t("projects.updated")}{" "}
                          {formatProjectDateTime(p.updatedAt)}
                        </p>
                      </div>
                    </Link>
                    <div className="flex flex-wrap items-center gap-1 border-t border-zinc-100 px-2 py-2">
                      <select
                        aria-label={t("projects.setCategory")}
                        value={cat}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__custom__") {
                            const name = window.prompt(
                              t("projects.newCategoryPrompt"),
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
                          {t("common.uncategorized")}
                        </option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {catLabel(c)}
                          </option>
                        ))}
                        <option value="__custom__">
                          {t("projects.newCategory")}
                        </option>
                      </select>
                      <button
                        type="button"
                        title={t("projects.backup")}
                        onClick={() => void handleExportBackup(p.id, p.title)}
                        className="rounded px-1.5 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100"
                      >
                        {t("projects.backup")}
                      </button>
                      <button
                        type="button"
                        title={t("projects.duplicate")}
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
                        {t("projects.duplicate")}
                      </button>
                      <button
                        type="button"
                        title={t("common.delete")}
                        onClick={() => {
                          if (
                            window.confirm(
                              t("projects.deleteConfirm", {
                                title: p.title || t("projects.unnamed"),
                              }),
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
                        {t("common.delete")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <p>
                {t("projects.pageInfo", {
                  n: filtered.length,
                  page: safePage,
                  total: totalPages,
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  {t("projects.prevPage")}
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  {t("projects.nextPage")}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
