"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TechPackPreview from "@/components/techpack/TechPackPreview";
import {
  renderAllArtboards,
  renderTechPackSheetToDataUrl,
  type AnnotatedImageMode,
} from "@/lib/export/canvas-render";
import {
  downloadDataUrl,
  exportFilename,
  styleExportBasename,
} from "@/lib/export/filename";
import {
  buildTechPackDocument,
} from "@/lib/export/techpack-document";
import { exportTechPackXlsx } from "@/lib/export/xlsx";
import { calcProgress } from "@/lib/project/progress";
import { getProject, saveProject } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [annotatedImages, setAnnotatedImages] = useState<
    Array<{ name: string; dataUrl: string }>
  >([]);
  const [stageCompositeUrl, setStageCompositeUrl] = useState<string | null>(
    null,
  );
  const [imageMode, setImageMode] = useState<AnnotatedImageMode>("merged");
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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
      if (!cancelled) {
        setImageMode(p.exportSettings?.annotatedImageMode ?? "merged");
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

    Promise.all([
      renderAllArtboards(
        project.canvas_data.artboards,
        project.intake.imageDataUrl,
        project.process_items,
        imageMode,
      ),
      renderTechPackSheetToDataUrl(project, imageMode, { forShare: true }),
    ])
      .then(([images, stageUrl]) => {
        if (cancelled) return;
        setAnnotatedImages(images);
        setStageCompositeUrl(stageUrl);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project, imageMode]);

  const pageCount = useMemo(() => {
    if (!project) return 0;
    return buildTechPackDocument(project, annotatedImages).length;
  }, [project, annotatedImages]);

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
      imageMode,
    };
    const history = [...(project.exportHistory ?? []), entry].slice(-20);
    const updated = { ...project, exportHistory: history };
    await saveProject(updated);
    setProject(updated);
  };

  const handleImageModeChange = (mode: AnnotatedImageMode) => {
    setImageMode(mode);
    if (!project) return;
    const updated: TechPackProject = {
      ...project,
      exportSettings: { ...project.exportSettings, annotatedImageMode: mode },
    };
    void saveProject(updated);
    setProject(updated);
  };

  const handleExportPdf = () => {
    if (!project) return;
    setBusy("pdf");
    void persistHistory("pdf", { pageCount }).finally(() => {
      // 打印另存为 PDF；文件名由系统对话框决定，预填提示用款式名
      document.title = exportFilename(project, "工艺包");
      window.print();
      setBusy(null);
    });
  };

  const handleExportXlsx = () => {
    if (!project) return;
    setBusy("xlsx");
    try {
      exportTechPackXlsx(project);
      void persistHistory("xlsx");
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadComposite = () => {
    if (!stageCompositeUrl || !project) return;
    setBusy("composite");
    const ext = stageCompositeUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
    downloadDataUrl(
      stageCompositeUrl,
      exportFilename(project, `合拼大图.${ext}`),
    );
    void persistHistory("composite").finally(() => setBusy(null));
  };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载中…
      </div>
    );
  }

  const progress = calcProgress(project);

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
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-zinc-200 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleImageModeChange("merged")}
                  className={`rounded-md px-2.5 py-1.5 ${
                    imageMode === "merged"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  合并标注图
                </button>
                <button
                  type="button"
                  onClick={() => handleImageModeChange("split")}
                  className={`rounded-md px-2.5 py-1.5 ${
                    imageMode === "split"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  工艺/尺寸分图
                </button>
              </div>
              <button
                type="button"
                disabled={rendering || busy !== null}
                onClick={handleExportPdf}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                {busy === "pdf" ? "…" : "导出 PDF"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleExportXlsx}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50 disabled:opacity-40"
              >
                {busy === "xlsx" ? "…" : "导出 Excel"}
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
          <p className="mb-3 text-[11px] text-zinc-400">
            PDF：打印对话框选「另存为 PDF / A4 横向」。Excel：一个文件多
            Sheet。合拼大图：适合微信转发，按款式名保存。
          </p>
          <TechPackPreview
            project={project}
            annotatedImages={annotatedImages}
          />
        </main>
      </div>

      <div className="hidden print:block">
        <TechPackPreview
          project={project}
          annotatedImages={annotatedImages}
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
