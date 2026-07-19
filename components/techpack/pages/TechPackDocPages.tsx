"use client";

import type { ReactNode } from "react";
import A4LandscapePage from "@/components/techpack/pages/A4LandscapePage";
import type {
  CoverOverview,
  DocMeta,
  TechPackDocPage,
} from "@/lib/export/techpack-document";
import { regionStandardLabel } from "@/lib/size-chart/standards";
import type { SizeRegionStandard } from "@/types/project";

type Props = {
  meta: DocMeta;
  pages: TechPackDocPage[];
  screenChrome?: boolean;
};

export default function TechPackDocPages({
  meta,
  pages,
  screenChrome = true,
}: Props) {
  return (
    <>
      {pages.map((page) => (
        <PageByKind
          key={page.id}
          meta={meta}
          page={page}
          screenChrome={screenChrome}
        />
      ))}
    </>
  );
}

function PageByKind({
  meta,
  page,
  screenChrome,
}: {
  meta: DocMeta;
  page: TechPackDocPage;
  screenChrome: boolean;
}) {
  switch (page.kind) {
    case "cover":
      return (
        <CoverOverviewPage
          meta={meta}
          overview={page.overview}
          screenChrome={screenChrome}
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
          sectionTitle="工艺 / 物料"
          screenChrome={screenChrome}
        >
          <div className="grid h-full min-h-0 grid-cols-2 gap-2">
            <div className="flex min-h-0 flex-col overflow-hidden border border-black">
              <p className="shrink-0 border-b border-black bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                结构工艺表
              </p>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ProcessTable items={page.processItems} offset={0} />
              </div>
            </div>
            <div className="flex min-h-0 flex-col overflow-hidden border border-black">
              <p className="shrink-0 border-b border-black bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                面辅料 BOM
              </p>
              <div className="min-h-0 flex-1 overflow-hidden">
                <BomTable items={page.bomItems} compact />
              </div>
            </div>
          </div>
        </A4LandscapePage>
      );

    case "process":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle="结构工艺表"
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
        >
          <ProcessTable items={page.items} offset={page.offset} />
        </A4LandscapePage>
      );

    case "bom":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle="BILL OF MATERIALS · 面辅料清单"
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
        >
          <BomTable items={page.items} padRows={page.padRows} />
        </A4LandscapePage>
      );

    case "size":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={`尺寸表（cm）${page.sampleSize ? ` · 基准 ${page.sampleSize}` : ""}${page.reviewText ? " · 评语" : ""}`}
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
                    <th className="border border-black px-1.5 py-1">部位</th>
                    <th className="border border-black px-1.5 py-1">量法</th>
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
                  款式评语
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
          sectionTitle="款式评语 REMARKS"
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
}: {
  items: import("@/types/process").ProcessItem[];
  offset: number;
}) {
  return (
    <table className="h-full w-full border-collapse text-[10px]">
      <thead>
        <tr className="bg-zinc-100 text-left">
          <th className="border border-black px-1 py-0.5 w-8">#</th>
          <th className="border border-black px-1 py-0.5 w-16">部位</th>
          <th className="border border-black px-1 py-0.5">工艺</th>
          <th className="border border-black px-1 py-0.5 w-14">针法</th>
          <th className="border border-black px-1 py-0.5 w-12">缝份</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td className="border border-black px-1 py-0.5 text-zinc-500">
              {offset + i + 1}
            </td>
            <td className="border border-black px-1 py-0.5 font-medium">
              {item.part || "—"}
            </td>
            <td className="border border-black px-1 py-0.5">
              {item.process || "—"}
            </td>
            <td className="border border-black px-1 py-0.5">
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
}: {
  items: import("@/types/process").BomItem[];
  padRows?: number;
  compact?: boolean;
}) {
  const empty = Array.from({ length: padRows }, (_, i) => i);
  const text = compact ? "text-[9px]" : "text-[10px]";
  return (
    <table className={`w-full border-collapse ${text}`}>
      <thead>
        <tr className="bg-zinc-100 text-left">
          <th className="border border-black px-1 py-0.5">名称</th>
          <th className="border border-black px-1 py-0.5">规格</th>
          <th className="border border-black px-1 py-0.5 w-12">用量</th>
          {!compact && (
            <th className="border border-black px-1 py-0.5 w-12">类别</th>
          )}
          <th className="border border-black px-1 py-0.5 w-12">颜色</th>
          {!compact && (
            <th className="border border-black px-1 py-0.5 w-14">编码</th>
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
}: {
  meta: DocMeta;
  overview: CoverOverview;
  screenChrome: boolean;
}) {
  const o = overview;
  const region = regionStandardLabel(
    o.regionStandard as SizeRegionStandard | undefined,
  );

  return (
    <A4LandscapePage
      meta={meta}
      sectionTitle="COVER / 协作总览"
      screenChrome={screenChrome}
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5 text-[10px] leading-snug">
        {/* 订单尺码表：数量留空供工厂手填 */}
        <div className="shrink-0 border border-black">
          <div className="flex items-center justify-between border-b border-black bg-zinc-100 px-2 py-0.5">
            <span className="font-bold uppercase">Order Quantity · 下单数量</span>
            <span className="text-zinc-500">
              {region || "尺码"}
              {o.sampleSize ? ` · 基准 ${o.sampleSize}` : ""} · 数量栏可手填
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
                  暂无款式图
                </p>
              )}
            </div>
            <div className="shrink-0 border border-black px-2 py-1">
              <span className="font-bold">资料包 </span>
              视图 {o.viewCount} 页 · 工艺 {o.processCount} 条 · 物料{" "}
              {o.bomCount} 项 · 参考图 {o.photoType}
              {o.features.length > 0
                ? ` · 特征 ${o.features.join("、")}`
                : ""}
            </div>
          </div>

          <div className="flex w-[38%] shrink-0 flex-col gap-1 overflow-hidden">
            <CoverBlock title="款式说明">
              {o.styleBrief || "（暂无描述，请在建款时补充）"}
            </CoverBlock>
            <CoverBlock title="主面料">
              {o.fabricLines.length
                ? o.fabricLines.map((line, i) => (
                    <p key={i} className="truncate">
                      · {line}
                    </p>
                  ))
                : "（暂无，见 BOM 页）"}
            </CoverBlock>
            <CoverBlock title="辅料 / 配件">
              {o.trimLines.length
                ? o.trimLines.map((line, i) => (
                    <p key={i} className="truncate">
                      · {line}
                    </p>
                  ))
                : "（暂无）"}
            </CoverBlock>
            <CoverBlock title="工艺部位">
              {o.processParts.length
                ? o.processParts.join("、")
                : "（暂无工艺条目）"}
            </CoverBlock>
            {(o.reviewBrief || o.questionnaireHints.length > 0) && (
              <CoverBlock title="协作注意" grow>
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
