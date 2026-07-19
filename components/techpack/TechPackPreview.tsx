"use client";

import { useEffect, useMemo, useState } from "react";
import TechPackDocPages from "@/components/techpack/pages/TechPackDocPages";
import {
  buildDocMeta,
  buildTechPackDocument,
  type AnnotatedImage,
} from "@/lib/export/techpack-document";
import type { TechPackProject } from "@/types/project";

type TechPackPreviewProps = {
  project: TechPackProject;
  annotatedImages?: AnnotatedImage[];
  /** 打印模式：铺开全部 A4 页 */
  printMode?: boolean;
};

export default function TechPackPreview({
  project,
  annotatedImages = [],
  printMode,
}: TechPackPreviewProps) {
  const meta = useMemo(() => buildDocMeta(project), [project]);
  const pages = useMemo(
    () => buildTechPackDocument(project, annotatedImages),
    [project, annotatedImages],
  );
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [pages.length, project.id]);

  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const current = pages[safeIndex];

  if (printMode) {
    return (
      <div className="techpack-print-root bg-white text-black">
        <TechPackDocPages meta={meta} pages={pages} screenChrome={false} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
        <p className="text-xs text-zinc-500">
          A4 横向 · {pages.length} 页 · {meta.targetLabel}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safeIndex <= 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            className="rounded border border-zinc-200 px-2 py-1 text-xs disabled:opacity-40"
          >
            上一页
          </button>
          <span className="min-w-[4.5rem] text-center text-xs font-medium text-zinc-700">
            {pages.length ? safeIndex + 1 : 0} / {pages.length}
          </span>
          <button
            type="button"
            disabled={safeIndex >= pages.length - 1}
            onClick={() =>
              setPageIndex((i) => Math.min(pages.length - 1, i + 1))
            }
            className="rounded border border-zinc-200 px-2 py-1 text-xs disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-3 sm:p-4">
        {current ? (
          <TechPackDocPages meta={meta} pages={[current]} screenChrome />
        ) : (
          <p className="py-16 text-center text-sm text-zinc-400">暂无页面</p>
        )}
      </div>
    </div>
  );
}
