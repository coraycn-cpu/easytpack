"use client";

import type { ReactNode } from "react";
import A4LandscapePage from "@/components/techpack/pages/A4LandscapePage";
import type {
  CoverOverview,
  DocMeta,
  TechPackDocPage,
} from "@/lib/export/techpack-document";
import { exportUiLabels } from "@/lib/export/export-labels";
import type { ExportLocale } from "@/lib/export/en-overlay";
import { regionStandardLabel } from "@/lib/size-chart/standards";
import type { SizeRegionStandard } from "@/types/project";

type Props = {
  meta: DocMeta;
  pages: TechPackDocPage[];
  screenChrome?: boolean;
  locale?: ExportLocale;
};

export default function TechPackDocPages({
  meta,
  pages,
  screenChrome = true,
  locale = "zh",
}: Props) {
  return (
    <>
      {pages.map((page) => (
        <PageByKind
          key={page.id}
          meta={meta}
          page={page}
          screenChrome={screenChrome}
          locale={locale}
        />
      ))}
    </>
  );
}

function PageByKind({
  meta,
  page,
  screenChrome,
  locale = "zh",
}: {
  meta: DocMeta;
  page: TechPackDocPage;
  screenChrome: boolean;
  locale?: ExportLocale;
}) {
  const L = exportUiLabels(locale);
  switch (page.kind) {
    case "cover":
      return (
        <CoverOverviewPage
          meta={meta}
          overview={page.overview}
          screenChrome={screenChrome}
          locale={locale}
        />
      );

    case "view": {
      const title =
        page.boards.length === 1
          ? `VIEW · ${page.boards[0].name}`
          : `VIEW · ${page.boards.map((b) => b.name).join(" / ")}`;
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={title}
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
        >
          <div
            className={`grid h-full gap-2 ${
              page.boards.length > 1 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {page.boards.map((board) => (
              <div
                key={board.name}
                className="flex min-h-0 flex-col border border-black bg-white"
              >
                {page.boards.length > 1 && (
                  <p className="shrink-0 border-b border-black bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                    {board.name}
                  </p>
                )}
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={board.dataUrl}
                      alt={board.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </A4LandscapePage>
      );
    }

    case "process_bom":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={L.processBom}
          screenChrome={screenChrome}
        >
          <div className="grid h-full min-h-0 grid-cols-2 gap-2">
            <div className="flex min-h-0 flex-col overflow-hidden border border-black">
              <p className="shrink-0 border-b border-black bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                {L.process}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ProcessTable items={page.processItems} offset={0} locale={locale} />
              </div>
            </div>
            <div className="flex min-h-0 flex-col overflow-hidden border border-black">
              <p className="shrink-0 border-b border-black bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                {L.bom}
              </p>
              <div className="min-h-0 flex-1 overflow-hidden">
                <BomTable items={page.bomItems} compact locale={locale} />
              </div>
            </div>
          </div>
        </A4LandscapePage>
      );

    case "process":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={L.process}
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
        >
          <ProcessTable items={page.items} offset={page.offset} locale={locale} />
        </A4LandscapePage>
      );

    case "bom":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={locale === "en" ? "BILL OF MATERIALS" : "BILL OF MATERIALS · 面辅料清单"}
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
        >
          <BomTable items={page.items} padRows={page.padRows} locale={locale} />
        </A4LandscapePage>
      );

    case "size":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={L.sizeWithSample(page.sampleSize, Boolean(page.reviewText))}
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
        >
          <div
            className={`flex h-full min-h-0 flex-col gap-1.5 ${
              page.reviewText ? "" : ""
            }`}
          >
            <div
              className={`min-h-0 overflow-hidden ${
                page.reviewText ? "flex-[1.4]" : "flex-1"
              }`}
            >
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-zinc-100 text-left">
                    <th className="border border-black px-1.5 py-1">{L.colPart}</th>
                    <th className="border border-black px-1.5 py-1">{L.colMethod}</th>
                    {page.sizes.map((s) => (
                      <th key={s} className="border border-black px-1.5 py-1">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-black px-1.5 py-1 font-medium">
                        {row.part}
                      </td>
                      <td className="border border-black px-1.5 py-1 text-zinc-600">
                        {row.method}
                      </td>
                      {page.sizes.map((s) => (
                        <td key={s} className="border border-black px-1.5 py-1">
                          {row.values[s] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {page.reviewText ? (
              <div className="min-h-0 flex-1 overflow-hidden border border-black">
                <p className="border-b border-black bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                  {L.review}
                </p>
                <p className="max-h-full overflow-hidden whitespace-pre-wrap px-2 py-1 text-[11px] leading-relaxed">
                  {page.reviewText}
                </p>
              </div>
            ) : null}
          </div>
        </A4LandscapePage>
      );

    case "review":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={L.review}
          screenChrome={screenChrome}
        >
          <div className="h-full overflow-hidden border border-black p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
            {page.text}
          </div>
        </A4LandscapePage>
      );

    default:
      return null;
  }
}

function ProcessTable({
  items,
  offset,
  locale = "zh",
}: {
  items: import("@/types/process").ProcessItem[];
  offset: number;
  locale?: ExportLocale;
}) {
  const L = exportUiLabels(locale);
  return (
    <table className="w-full table-fixed border-collapse text-[10px]">
      <thead>
        <tr className="bg-zinc-100 text-left">
          <th className="w-7 border border-black px-1 py-0.5">#</th>
          <th className="w-[18%] border border-black px-1 py-0.5">{L.colPart}</th>
          <th className="border border-black px-1 py-0.5">{L.colProcess}</th>
          <th className="w-[16%] border border-black px-1 py-0.5">{L.colStitch}</th>
          <th className="w-[12%] border border-black px-1 py-0.5">{L.colSeam}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.id ?? i} className="align-top">
            <td className="border border-black px-1 py-0.5 text-zinc-500">
              {offset + i + 1}
            </td>
            <td className="border border-black px-1 py-0.5 font-medium break-words">
              {item.part || "—"}
            </td>
            <td className="border border-black px-1 py-0.5 break-words leading-snug">
              {item.process || "—"}
            </td>
            <td className="border border-black px-1 py-0.5 break-words leading-snug">
              {item.stitch || "—"}
            </td>
            <td className="border border-black px-1 py-0.5">
              {item.seam_allowance || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BomTable({
  items,
  padRows = 0,
  compact,
  locale = "zh",
}: {
  items: import("@/types/process").BomItem[];
  padRows?: number;
  compact?: boolean;
  locale?: ExportLocale;
}) {
  const L = exportUiLabels(locale);
  const empty = Array.from({ length: padRows }, (_, i) => i);
  const text = compact ? "text-[9px]" : "text-[10px]";
  return (
    <table className={`w-full border-collapse ${text}`}>
      <thead>
        <tr className="bg-zinc-100 text-left">
          <th className="border border-black px-1 py-0.5">{L.colName}</th>
          <th className="border border-black px-1 py-0.5">{L.colSpec}</th>
          <th className="border border-black px-1 py-0.5 w-12">{L.colUsage}</th>
          {!compact && (
            <th className="border border-black px-1 py-0.5 w-12">{L.colCategory}</th>
          )}
          <th className="border border-black px-1 py-0.5 w-12">{L.colColor}</th>
          {!compact && (
            <th className="border border-black px-1 py-0.5 w-14">{L.colCode}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td className="border border-black px-1 py-0.5 font-medium">
              {item.name || "—"}
            </td>
            <td className="border border-black px-1 py-0.5">
              {item.spec || "—"}
            </td>
            <td className="border border-black px-1 py-0.5">
              {item.usage || "—"}
            </td>
            {!compact && (
              <td className="border border-black px-1 py-0.5">
                {item.category || "—"}
              </td>
            )}
            <td className="border border-black px-1 py-0.5">
              {item.color || "—"}
            </td>
            {!compact && (
              <td className="border border-black px-1 py-0.5">
                {item.code || "—"}
              </td>
            )}
          </tr>
        ))}
        {empty.map((i) => (
          <tr key={`pad_${i}`}>
            {Array.from({ length: compact ? 4 : 6 }).map((_, j) => (
              <td key={j} className="border border-black px-1 py-2">
                &nbsp;
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CoverOverviewPage({
  meta,
  overview,
  screenChrome,
  locale = "zh",
}: {
  meta: DocMeta;
  overview: CoverOverview;
  screenChrome: boolean;
  locale?: ExportLocale;
}) {
  const o = overview;
  const L = exportUiLabels(locale);
  const region = regionStandardLabel(
    o.regionStandard as SizeRegionStandard | undefined,
  );

  return (
    <A4LandscapePage
      meta={meta}
      sectionTitle={L.cover}
      screenChrome={screenChrome}
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5 text-[10px] leading-snug">
        {/* 订单尺码表：数量留空供工厂手填 */}
        <div className="shrink-0 border border-black">
          <div className="flex items-center justify-between border-b border-black bg-zinc-100 px-2 py-0.5">
            <span className="font-bold uppercase">{L.orderQty}</span>
            <span className="text-zinc-500">
              {region || L.sizeHint}
              {o.sampleSize ? ` · ${L.sampleHint} ${o.sampleSize}` : ""} · {L.qtyFill}
            </span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-r border-black px-1 py-0.5 text-left font-bold">
                  SIZE
                </th>
                {o.sizeColumns.map((s) => (
                  <th
                    key={s}
                    className="border-r border-black px-1 py-0.5 font-bold last:border-r-0"
                  >
                    {s}
                  </th>
                ))}
                <th className="px-1 py-0.5 font-bold">COLOR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-t border-r border-black px-1 py-1 font-medium">
                  QTY
                </td>
                {o.sizeColumns.map((s) => (
                  <td
                    key={s}
                    className="border-t border-r border-black px-1 py-1 last:border-r-0"
                  >
                    &nbsp;
                  </td>
                ))}
                <td className="border-t border-black px-1 py-1">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex min-h-0 flex-1 gap-1.5">
          <div className="flex min-w-0 flex-[1.15] flex-col gap-1.5">
            <div className="relative min-h-0 flex-1 overflow-hidden border border-black bg-white">
              {o.heroUrl ? (
                <div className="absolute inset-0 flex items-center justify-center p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={o.heroUrl}
                    alt={o.heroLabel}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <p className="flex h-full items-center justify-center text-zinc-400">
                  {L.noImage}
                </p>
              )}
            </div>
            <div className="shrink-0 border border-black px-2 py-1">
              <span className="font-bold">{L.coverPack} </span>
              {L.coverViews} {o.viewCount} · {L.coverProcessCount}{" "}
              {o.processCount} · {L.coverBomCount} {o.bomCount} · {L.coverPhoto}{" "}
              {o.photoType}
              {o.features.length > 0
                ? ` · ${L.coverFeatures} ${o.features.join(locale === "en" ? ", " : "、")}`
                : ""}
            </div>
          </div>

          <div className="flex w-[38%] shrink-0 flex-col gap-1 overflow-hidden">
            <CoverBlock title={L.coverStyle}>
              {o.styleBrief || L.noDesc}
            </CoverBlock>
            <CoverBlock title={L.coverFabric}>
              {o.fabricLines.length
                ? o.fabricLines.map((line, i) => (
                    <p key={i} className="truncate">
                      · {line}
                    </p>
                  ))
                : L.noFabric}
            </CoverBlock>
            <CoverBlock title={L.coverTrim}>
              {o.trimLines.length
                ? o.trimLines.map((line, i) => (
                    <p key={i} className="truncate">
                      · {line}
                    </p>
                  ))
                : L.noTrim}
            </CoverBlock>
            <CoverBlock title={L.coverProcess}>
              {o.processParts.length
                ? o.processParts.join(locale === "en" ? ", " : "、")
                : L.noProcess}
            </CoverBlock>
            {(o.reviewBrief || o.questionnaireHints.length > 0) && (
              <CoverBlock title={L.coverNotes} grow>
                {o.reviewBrief ? (
                  <p className="whitespace-pre-wrap">{o.reviewBrief}</p>
                ) : null}
                {o.questionnaireHints.map((h, i) => (
                  <p key={i} className="truncate text-zinc-600">
                    · {h}
                  </p>
                ))}
              </CoverBlock>
            )}
          </div>
        </div>
      </div>
    </A4LandscapePage>
  );
}

function CoverBlock({
  title,
  children,
  grow,
}: {
  title: string;
  children: ReactNode;
  grow?: boolean;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden border border-black ${
        grow ? "min-h-0 flex-1" : "shrink-0"
      }`}
    >
      <p className="shrink-0 border-b border-black bg-zinc-100 px-1.5 py-0.5 font-bold uppercase">
        {title}
      </p>
      <div
        className={`overflow-hidden px-1.5 py-1 text-zinc-800 ${
          grow ? "min-h-0 flex-1" : "max-h-[3.6rem]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
