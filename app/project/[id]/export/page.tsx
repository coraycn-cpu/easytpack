"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TechPackPreview from "@/components/techpack/TechPackPreview";
import { exportBomCsv, exportProcessCsv, exportSizeChartCsv } from "@/lib/export/excel";
import {
  renderAllArtboards,
  renderTechPackSheetToDataUrl,
  type AnnotatedImageMode,
} from "@/lib/export/canvas-render";
import { calcProgress } from "@/lib/project/progress";
import { getProject, saveProject } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [annotatedImages, setAnnotatedImages] = useState<
    Array<{ name: string; dataUrl: string }>
  >([]);
  const [stageCompositeUrl, setStageCompositeUrl] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<AnnotatedImageMode>("merged");
  const [rendering, setRendering] = useState(false);

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
      renderTechPackSheetToDataUrl(project, "merged"),
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

  const handlePrint = () => window.print();

  const handleDownloadStage = () => {
    if (!stageCompositeUrl || !project) return;
    const ext = stageCompositeUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
    const safeTitle = (project.title || "techpack").replace(/[\\/:*?"<>|]+/g, "_");
    downloadDataUrl(stageCompositeUrl, `${safeTitle}-工艺包大图.${ext}`);
  };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载预览...
      </div>
    );
  }

  const progress = calcProgress(project);

  return (
    <>
      <div className="print:hidden">
        <header className="border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href={`/project/${id}/studio`}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                ← 返回画板
              </Link>
              <h1 className="text-lg font-semibold text-zinc-900">Tech Pack 预览</h1>
              <p className="text-xs text-zinc-500">
                完成度 {progress}%
                {rendering ? " · 正在生成画布大图…" : ""}
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
                disabled={!stageCompositeUrl || rendering}
                onClick={handleDownloadStage}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
              >
                下载工艺包大图
              </button>
              <button
                type="button"
                onClick={() =>
                  exportProcessCsv(project.process_items, `${project.title}-工艺表.csv`)
                }
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
              >
                导出工艺表
              </button>
              <button
                type="button"
                onClick={() => exportBomCsv(project.bom_items, `${project.title}-BOM.csv`)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
              >
                导出 BOM
              </button>
              <button
                type="button"
                onClick={() =>
                  exportSizeChartCsv(project.size_chart, `${project.title}-尺寸表.csv`)
                }
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
              >
                导出尺寸表
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                打印 / 保存 PDF
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8">
          <TechPackPreview
            project={project}
            annotatedImages={annotatedImages}
            stageCompositeUrl={stageCompositeUrl}
          />
        </main>
      </div>

      <div className="hidden print:block">
        <TechPackPreview
          project={project}
          annotatedImages={annotatedImages}
          stageCompositeUrl={stageCompositeUrl}
          printMode
        />
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}
