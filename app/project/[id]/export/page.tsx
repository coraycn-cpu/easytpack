"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TechPackPreview from "@/components/techpack/TechPackPreview";
import { exportBomCsv, exportSizeChartCsv } from "@/lib/export/excel";
import { renderAllArtboards, type AnnotatedImageMode } from "@/lib/export/canvas-render";
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
  const [imageMode, setImageMode] = useState<AnnotatedImageMode>("merged");

  useEffect(() => {
    const p = getProject(id);
    if (!p) {
      router.replace("/");
      return;
    }
    if (p.workflowStatus !== "finalized") {
      const updated = { ...p, workflowStatus: "in_review" as const };
      saveProject(updated);
      setProject(updated);
    } else {
      setProject(p);
    }
    setImageMode(p.exportSettings?.annotatedImageMode ?? "merged");
  }, [id, router]);

  useEffect(() => {
    if (!project) return;
    renderAllArtboards(
      project.canvas_data.artboards,
      project.intake.imageDataUrl,
      project.process_items,
      imageMode,
    ).then(setAnnotatedImages);
  }, [project, imageMode]);

  const handleImageModeChange = (mode: AnnotatedImageMode) => {
    setImageMode(mode);
    if (!project) return;
    const updated: TechPackProject = {
      ...project,
      exportSettings: { ...project.exportSettings, annotatedImageMode: mode },
    };
    saveProject(updated);
    setProject(updated);
  };

  const handlePrint = () => window.print();

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
              <p className="text-xs text-zinc-500">完成度 {progress}%</p>
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
          <TechPackPreview project={project} annotatedImages={annotatedImages} />
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
          body {
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}
