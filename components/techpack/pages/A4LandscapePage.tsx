"use client";

import type { ReactNode } from "react";
import { BRAND_NAME } from "@/lib/brand";
import type { DocMeta } from "@/lib/export/techpack-document";

type A4LandscapePageProps = {
  meta: DocMeta;
  sectionTitle: string;
  pageLabel?: string;
  children: ReactNode;
  /** 屏上预览时加阴影；打印时去掉 */
  screenChrome?: boolean;
};

/** A4 横向单页壳：屏上流式宽度防裁切；打印固定 297×210mm */
export default function A4LandscapePage({
  meta,
  sectionTitle,
  pageLabel,
  children,
  screenChrome = true,
}: A4LandscapePageProps) {
  return (
    <section
      className={`a4-landscape-page flex flex-col overflow-hidden border border-black bg-white text-black ${
        screenChrome
          ? "mx-auto mb-0 w-full max-w-full shadow-md"
          : "mx-auto mb-0 shadow-none"
      }`}
      style={
        screenChrome
          ? {
              aspectRatio: "297 / 210",
              height: "auto",
              minHeight: 0,
            }
          : {
              width: "297mm",
              height: "210mm",
              pageBreakAfter: "always",
              breakAfter: "page",
            }
      }
    >
      <header className="shrink-0 border-b border-black">
        <div className="grid grid-cols-12 border-b border-black text-[10px] leading-tight">
          <div className="col-span-2 flex items-center justify-center border-r border-black px-2 py-1.5 font-bold tracking-wide">
            {BRAND_NAME}
          </div>
          <div className="col-span-10 grid grid-cols-3">
            <MetaCell label="NAME" value={meta.targetLabel || meta.title} />
            <MetaCell label="CATEGORY" value={meta.category} />
            <MetaCell label="DATE" value={meta.date} borderRight={false} />
            <MetaCell label="MATERIALS" value={meta.materialsHint} />
            <MetaCell label="SIZE" value={meta.sizeRange} />
            <MetaCell label="STYLE NO" value={meta.styleNo} borderRight={false} />
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-black px-3 py-1">
          <p className="text-[11px] font-bold uppercase tracking-wider">
            {sectionTitle}
          </p>
          {pageLabel ? (
            <p className="text-[10px] text-zinc-500">{pageLabel}</p>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">{children}</div>

      <footer className="flex shrink-0 items-center justify-between border-t border-black px-3 py-1 text-[9px] text-zinc-600">
        <span>
          {meta.title} · {meta.workflow}
        </span>
        <span className="font-mono">{meta.styleNo}</span>
      </footer>
    </section>
  );
}

function MetaCell({
  label,
  value,
  borderRight = true,
}: {
  label: string;
  value: string;
  borderRight?: boolean;
}) {
  return (
    <div
      className={`border-b border-black px-2 py-1 ${
        borderRight ? "border-r border-black" : ""
      }`}
    >
      <p className="font-bold text-[9px] uppercase text-zinc-500">{label}</p>
      <p className="truncate text-[11px] font-medium">{value || "—"}</p>
    </div>
  );
}
