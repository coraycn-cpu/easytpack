"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TechPackPreview from "@/components/techpack/TechPackPreview";
import { getProject, saveProject } from "@/lib/project/storage";
import { calcProgress } from "@/lib/project/progress";
import type { TechPackProject } from "@/types/project";

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);

  useEffect(() => {
    const p = getProject(id);
    if (!p) {
      router.replace("/");
      return;
    }
    if (p.status === "studio") {
      const completed = { ...p, status: "completed" as const };
      saveProject(completed);
      setProject(completed);
    } else {
      setProject(p);
    }
  }, [id, router]);

  const handlePrint = () => {
    window.print();
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
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div>
              <Link
                href={`/project/${id}/studio`}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                ← 返回画板
              </Link>
              <h1 className="text-lg font-semibold text-zinc-900">Tech Pack 预览</h1>
              <p className="text-xs text-zinc-500">完成度 {progress}% · 可打印或保存为 PDF</p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              打印 / 保存 PDF
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8">
          <TechPackPreview project={project} />
        </main>
      </div>

      <div className="hidden print:block">
        <TechPackPreview project={project} printMode />
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
