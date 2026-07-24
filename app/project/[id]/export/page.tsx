"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TechPackPreview from "@/components/techpack/TechPackPreview";
import {
  gateAiLogin,
  messageFromAiResponse,
} from "@/lib/ai/client-login-gate";
import {
  renderAllArtboards,
  renderArtboardToDataUrl,
  renderTechPackSheetToDataUrl,
} from "@/lib/export/canvas-render";
import {
  applyEnOverlay,
  type ExportLocale,
  type TechPackEnOverlay,
} from "@/lib/export/en-overlay";
import {
  downloadDataUrl,
  exportFilename,
  styleExportBasename,
} from "@/lib/export/filename";
import { buildTechPackDocument } from "@/lib/export/techpack-document";
import { exportTechPackXlsx } from "@/lib/export/xlsx";
import { sortArtboardsForExport } from "@/lib/export/artboard-order";
import { calcProgress } from "@/lib/project/progress";
import { getProject, saveProject } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

import { COMM_PACK_COPY } from "@/lib/studio/region-edit-ux";

/** 分页导出统一用合并标注；分图开关已去掉 */
const IMAGE_MODE = "merged" as const;

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [annotatedImages, setAnnotatedImages] = useState<
    Array<{ name: string; dataUrl: string }>
  >([]);
  const [coverHeroUrl, setCoverHeroUrl] = useState<string | null>(null);
  const [coverHeroLabel, setCoverHeroLabel] = useState<string>("款式图");
  const [stageCompositeUrl, setStageCompositeUrl] = useState<string | null>(
    null,
  );
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [exportLocale, setExportLocale] = useState<ExportLocale>("zh");
  const [enOverlay, setEnOverlay] = useState<TechPackEnOverlay | null>(null);
  const [translateBusy, setTranslateBusy] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [correctionHints, setCorrectionHints] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getProject(id).then(async (p) => {
      if (cancelled) return;
      if (!p) {
        router.replace("/");
        return;
      }
      if (p.workflowStatus !== "finalized") {
        const updated = { ...p, workflowStatus: "in_review" as const };
        await saveProject(updated);
        if (!cancelled) setProject(updated);
      } else if (!cancelled) {
        setProject(p);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    setRendering(true);

    const ordered = sortArtboardsForExport(project.canvas_data.artboards);
    const primary = ordered[0];

    Promise.all([
      renderAllArtboards(
        project.canvas_data.artboards,
        project.intake.imageDataUrl,
        project.process_items,
        IMAGE_MODE,
      ),
      primary
        ? renderArtboardToDataUrl(primary, project.intake.imageDataUrl, {
            layerFilter: "none",
            processItems: [],
          })
        : Promise.resolve(null),
      renderTechPackSheetToDataUrl(project, IMAGE_MODE, { forShare: true }),
    ])
      .then(([images, cleanHero, stageUrl]) => {
        if (cancelled) return;
        setAnnotatedImages(images);
        setCoverHeroUrl(
          cleanHero ||
            primary?.imageDataUrl ||
            project.intake.imageDataUrl ||
            null,
        );
        setCoverHeroLabel(primary?.name ?? "款式图");
        setStageCompositeUrl(stageUrl);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project]);

  const displayProject = useMemo(() => {
    if (!project) return null;
    if (exportLocale === "en" && enOverlay) {
      return applyEnOverlay(project, enOverlay);
    }
    return project;
  }, [project, exportLocale, enOverlay]);

  const displayAnnotatedImages = useMemo(() => {
    if (!displayProject || exportLocale !== "en" || !enOverlay) {
      return annotatedImages;
    }
    const nameById = enOverlay.artboard_names ?? {};
    const ordered = sortArtboardsForExport(displayProject.canvas_data.artboards);
    return annotatedImages.map((img, i) => {
      const ab = ordered[i];
      const enName = ab ? nameById[ab.id]?.trim() || ab.name : undefined;
      return enName ? { ...img, name: enName } : img;
    });
  }, [annotatedImages, displayProject, exportLocale, enOverlay]);

  const displayCoverHeroLabel = useMemo(() => {
    if (exportLocale !== "en" || !enOverlay || !project) return coverHeroLabel;
    const ordered = sortArtboardsForExport(project.canvas_data.artboards);
    const primary = ordered[0];
    if (!primary) return coverHeroLabel;
    return enOverlay.artboard_names?.[primary.id]?.trim() || coverHeroLabel;
  }, [coverHeroLabel, exportLocale, enOverlay, project]);

  const pageCount = useMemo(() => {
    if (!displayProject) return 0;
    return buildTechPackDocument(displayProject, displayAnnotatedImages, {
      coverHeroUrl,
      coverHeroLabel: displayCoverHeroLabel,
      locale: exportLocale,
    }).length;
  }, [
    displayProject,
    displayAnnotatedImages,
    coverHeroUrl,
    displayCoverHeroLabel,
    exportLocale,
  ]);

  const honestyIssues = useMemo(() => {
    if (!project) return [] as string[];
    const issues: string[] = [];
    for (const ab of project.canvas_data.artboards) {
      const status = ab.viewImageMeta?.generationStatus;
      const name = ab.name || "未命名视角";
      if (status === "failed") {
        issues.push(`「${name}」生图失败，请回画板重试或删除后再导出`);
      } else if (status === "placeholder") {
        issues.push(
          `「${name}」仍是占位/示意稿，勿当作真实成品图发给版师`,
        );
      }
    }
    return issues;
  }, [project]);

  const persistHistory = async (
    kind: "pdf" | "xlsx" | "composite",
    extra?: { pageCount?: number },
  ) => {
    if (!project) return;
    const entry = {
      at: new Date().toISOString(),
      kind,
      basename: styleExportBasename(project),
      pageCount: extra?.pageCount,
      imageMode: IMAGE_MODE,
      locale: exportLocale,
    };
    const history = [...(project.exportHistory ?? []), entry].slice(-20);
    const updated = { ...project, exportHistory: history };
    await saveProject(updated);
    setProject(updated);
  };

  const runTranslate = async (opts?: { refine?: boolean }) => {
    if (!project) return;
    setTranslateError(null);

    const gate = await gateAiLogin({ next: `/project/${id}/export` });
    if (!gate.ok) {
      setTranslateError(gate.message);
      if (window.confirm(`${gate.message}\n\n去注册/登录？`)) {
        router.push(gate.href);
      }
      return;
    }

    setTranslateBusy(true);
    try {
      const res = await fetch("/api/ai/translate-techpack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          project,
          existingOverlay: opts?.refine ? enOverlay : undefined,
          correctionHints: opts?.refine
            ? correctionHints.trim() || undefined
            : undefined,
        }),
      });
      const data = (await res.json()) as {
        overlay?: TechPackEnOverlay;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        throw new Error(messageFromAiResponse(data, "英译失败"));
      }
      if (!data.overlay) {
        throw new Error("未返回英译结果");
      }
      setEnOverlay(data.overlay);
      setExportLocale("en");
      setShowCorrection(true);
      if (data.overlay.correction_notes) {
        // 保留用户输入；不把 AI 说明写进纠正框
      }
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "英译失败");
    } finally {
      setTranslateBusy(false);
    }
  };

  const handleExportPdf = () => {
    if (!displayProject) return;
    if (exportLocale === "en" && !enOverlay) {
      window.alert("请先点「AI 英译」，再导出英文版 PDF。");
      return;
    }
    if (
      honestyIssues.length > 0 &&
      !window.confirm(
        `检测到可能不适合发给版师的图：\n- ${honestyIssues.join("\n- ")}\n\n仍要继续导出 PDF 吗？`,
      )
    ) {
      return;
    }
    setBusy("pdf");
    void persistHistory("pdf", { pageCount }).finally(() => {
      document.title = exportFilename(
        displayProject,
        exportLocale === "en" ? "TechPack-EN" : "工艺包",
      );
      window.print();
      setBusy(null);
    });
  };

  const handleExportXlsx = () => {
    if (!displayProject) return;
    if (exportLocale === "en" && !enOverlay) {
      window.alert("请先点「AI 英译」，再导出英文版 Excel。");
      return;
    }
    if (
      honestyIssues.length > 0 &&
      !window.confirm(
        `检测到可能不适合发给版师的图：\n- ${honestyIssues.join("\n- ")}\n\n仍要继续导出 Excel 吗？`,
      )
    ) {
      return;
    }
    setBusy("xlsx");
    void exportTechPackXlsx(displayProject, displayAnnotatedImages, {
      locale: exportLocale,
    })
      .then(() => persistHistory("xlsx"))
      .finally(() => setBusy(null));
  };

  const handleDownloadComposite = () => {
    if (!stageCompositeUrl || !project) return;
    if (
      honestyIssues.length > 0 &&
      !window.confirm(
        `检测到可能不适合发给版师的图：\n- ${honestyIssues.join("\n- ")}\n\n仍要下载合拼大图吗？`,
      )
    ) {
      return;
    }
    setBusy("composite");
    const ext = stageCompositeUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
    downloadDataUrl(
      stageCompositeUrl,
      exportFilename(project, `合拼大图.${ext}`),
    );
    void persistHistory("composite").finally(() => setBusy(null));
  };

  if (!project || !displayProject) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载中…
      </div>
    );
  }

  const progress = calcProgress(project);
  const canUseEn = Boolean(enOverlay);
  const isEn = exportLocale === "en";

  return (
    <>
      <div className="print:hidden">
        <header className="border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href={`/project/${id}/studio`}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                ← 返回画板
              </Link>
              <h1 className="text-lg font-semibold text-zinc-900">
                导出工艺包
              </h1>
              <p className="text-xs text-zinc-500">
                {styleExportBasename(project)} · 完成度 {progress}%
                {rendering ? " · 正在生成图…" : ""}
                {pageCount ? ` · ${pageCount} 页` : ""}
                {isEn ? " · 英文预览" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={rendering || busy !== null}
                onClick={handleExportPdf}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                {busy === "pdf"
                  ? "…"
                  : isEn
                    ? "导出 PDF（英文）"
                    : "导出 PDF"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleExportXlsx}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50 disabled:opacity-40"
              >
                {busy === "xlsx"
                  ? "…"
                  : isEn
                    ? "导出 Excel（英文）"
                    : "导出 Excel"}
              </button>
              <button
                type="button"
                disabled={!stageCompositeUrl || rendering || busy !== null}
                onClick={handleDownloadComposite}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
              >
                {busy === "composite" ? "…" : "下载合拼大图"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">
          {honestyIssues.length > 0 ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-[11px] leading-relaxed text-red-950">
              <p className="font-semibold text-red-900">导出前请注意（图诚实提示）</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-red-900/90">
                {honestyIssues.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
              <p className="mt-2 text-red-800/80">
                建议先回画板处理失败/占位图，再发给版师。
              </p>
            </div>
          ) : null}

          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-[11px] leading-relaxed text-sky-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sky-900">
                  外贸英文版（AI 服装专业英语）
                </p>
                <p className="mt-1 text-sky-900/80">
                  不改你本机里的中文原稿。先点「AI 英译」，再切换看英文预览；导出 PDF / Excel
                  会按当前预览语言。图上的中文标注像素暂不改。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={translateBusy || busy !== null}
                  onClick={() => void runTranslate()}
                  className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-medium text-white hover:bg-sky-800 disabled:opacity-40"
                >
                  {translateBusy
                    ? "翻译中…"
                    : canUseEn
                      ? "重新英译"
                      : "AI 英译"}
                </button>
                <div className="inline-flex overflow-hidden rounded-lg border border-sky-200 bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => setExportLocale("zh")}
                    className={`px-3 py-2 ${
                      !isEn
                        ? "bg-sky-700 text-white"
                        : "text-sky-900 hover:bg-sky-50"
                    }`}
                  >
                    中文
                  </button>
                  <button
                    type="button"
                    disabled={!canUseEn}
                    onClick={() => setExportLocale("en")}
                    title={canUseEn ? undefined : "请先完成 AI 英译"}
                    className={`px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                      isEn
                        ? "bg-sky-700 text-white"
                        : "text-sky-900 hover:bg-sky-50"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>

            {translateError ? (
              <p className="mt-2 text-red-700">{translateError}</p>
            ) : null}

            {enOverlay?.correction_notes ? (
              <p className="mt-2 rounded-lg border border-sky-100 bg-white/70 px-2.5 py-2 text-sky-900/90">
                <span className="font-medium">术语纠正说明：</span>
                {enOverlay.correction_notes}
              </p>
            ) : null}

            {canUseEn ? (
              <div className="mt-3 border-t border-sky-100 pt-3">
                <button
                  type="button"
                  className="text-[11px] font-medium text-sky-800 underline-offset-2 hover:underline"
                  onClick={() => setShowCorrection((v) => !v)}
                >
                  {showCorrection ? "收起纠正" : "写纠正意见，再润色英文"}
                </button>
                {showCorrection ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={correctionHints}
                      onChange={(e) => setCorrectionHints(e.target.value)}
                      rows={3}
                      placeholder="例如：衣长请用 CB length；缝份统一写成 seam allowance；前片不要译成 front piece…"
                      className="w-full rounded-lg border border-sky-200 bg-white px-2.5 py-2 text-[11px] text-zinc-800 outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      disabled={
                        translateBusy ||
                        busy !== null ||
                        !correctionHints.trim()
                      }
                      onClick={() => void runTranslate({ refine: true })}
                      className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-40"
                    >
                      {translateBusy ? "润色中…" : "按意见重新润色"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] leading-relaxed text-amber-950">
            <p className="font-semibold text-amber-900">发给版师前自检</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-amber-900/90">
              <li>封面标题、尺码标准、样衣码是否正确</li>
              <li>工艺 / BOM / 尺寸表是否有空行或缺关键数值</li>
              <li>画布标注是否指向关键部位（图仅供沟通，以表为准）</li>
              <li>是否仍有失败或占位视角图（见上方红色提示）</li>
              <li>
                <strong>PDF</strong>：系统打印对话框选「另存为 PDF」· A4 ·{" "}
                <strong>横向</strong> · 背景图形开启
              </li>
              <li>
                <strong>Excel</strong>：含工艺/物料/尺码 +「视图」附图，适合改数
              </li>
              <li>
                <strong>合拼大图</strong>：适合微信预览，不替代正式表
              </li>
              <li>
                <strong>英文版</strong>：先 AI 英译 → 切到 English → 再导出
              </li>
            </ol>
            <p className="mt-2 text-amber-800/80">{COMM_PACK_COPY.exportHint}</p>
          </div>
          <label className="mb-4 flex cursor-pointer items-start gap-2 text-[11px] text-zinc-600">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(project.consentQualityPool)}
              onChange={(e) => {
                const updated = {
                  ...project,
                  consentQualityPool: e.target.checked,
                };
                void saveProject(updated).then(() => setProject(updated));
              }}
            />
            <span>
              同意本款匿名摘要进入质量改进池（默认关闭；下期管理后台用）
            </span>
          </label>
          <TechPackPreview
            project={displayProject}
            annotatedImages={displayAnnotatedImages}
            coverHeroUrl={coverHeroUrl}
            coverHeroLabel={displayCoverHeroLabel}
            locale={exportLocale}
          />
        </main>
      </div>

      <div className="hidden print:block">
        <TechPackPreview
          project={displayProject}
          annotatedImages={displayAnnotatedImages}
          coverHeroUrl={coverHeroUrl}
          coverHeroLabel={displayCoverHeroLabel}
          locale={exportLocale}
          printMode
        />
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-landscape-page {
            width: 277mm !important;
            height: 194mm !important;
            max-width: none !important;
            aspect-ratio: auto !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
          .a4-landscape-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </>
  );
}
