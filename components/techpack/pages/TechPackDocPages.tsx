"use client";

import A4LandscapePage from "@/components/techpack/pages/A4LandscapePage";
import type {
  DocMeta,
  TechPackDocPage,
} from "@/lib/export/techpack-document";

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
        <A4LandscapePage
          meta={meta}
          sectionTitle="COVER / 总览"
          screenChrome={screenChrome}
        >
          <div className="flex h-full gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 border border-black p-2 text-[11px]">
                <div>
                  <span className="font-bold">款式 </span>
                  {meta.targetLabel}
                </div>
                <div>
                  <span className="font-bold">品类 </span>
                  {meta.category}
                </div>
                <div>
                  <span className="font-bold">面料 </span>
                  {meta.materialsHint}
                </div>
                <div>
                  <span className="font-bold">尺码 </span>
                  {meta.sizeRange}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden border border-black bg-zinc-50 p-2">
                {page.heroUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.heroUrl}
                    alt={page.heroLabel}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="flex h-full items-center justify-center text-xs text-zinc-400">
                    暂无款式图
                  </p>
                )}
              </div>
            </div>
            <div className="w-[32%] shrink-0 overflow-hidden border border-black p-2 text-[11px] leading-relaxed">
              <p className="mb-1 font-bold uppercase">Summary</p>
              <p className="whitespace-pre-wrap text-zinc-700">
                {meta.description || "（无描述）"}
              </p>
            </div>
          </div>
        </A4LandscapePage>
      );

    case "view":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={`VIEW · ${page.boardName}`}
          screenChrome={screenChrome}
        >
          <div className="flex h-full items-center justify-center border border-black bg-zinc-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.imageDataUrl}
              alt={page.boardName}
              className="max-h-full max-w-full object-contain"
            />
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
          <table className="h-full w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="border border-black px-1.5 py-1 w-10">序号</th>
                <th className="border border-black px-1.5 py-1 w-24">部位</th>
                <th className="border border-black px-1.5 py-1">工艺描述</th>
                <th className="border border-black px-1.5 py-1 w-20">针法</th>
                <th className="border border-black px-1.5 py-1 w-16">缝份</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item, i) => (
                <tr key={i}>
                  <td className="border border-black px-1.5 py-1 text-zinc-500">
                    {page.offset + i + 1}
                  </td>
                  <td className="border border-black px-1.5 py-1 font-medium">
                    {item.part || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.process || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.stitch || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.seam_allowance || "—"}
                  </td>
                </tr>
              ))}
              {page.items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-black px-2 py-8 text-center text-zinc-400"
                  >
                    暂无工艺条目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </A4LandscapePage>
      );

    case "bom": {
      const empty = Array.from({ length: page.padRows }, (_, i) => i);
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
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="border border-black px-1.5 py-1">名称</th>
                <th className="border border-black px-1.5 py-1">规格/描述</th>
                <th className="border border-black px-1.5 py-1 w-16">用量</th>
                <th className="border border-black px-1.5 py-1 w-14">类别</th>
                <th className="border border-black px-1.5 py-1 w-16">部位</th>
                <th className="border border-black px-1.5 py-1 w-16">颜色</th>
                <th className="border border-black px-1.5 py-1 w-20">编码</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item, i) => (
                <tr key={i}>
                  <td className="border border-black px-1.5 py-1 font-medium">
                    {item.name || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.spec || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.usage || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.category || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.garmentPart || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.color || "—"}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {item.code || "—"}
                  </td>
                </tr>
              ))}
              {empty.map((i) => (
                <tr key={`pad_${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="border border-black px-1.5 py-2.5">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
              {page.items.length === 0 && page.padRows === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="border border-black px-2 py-8 text-center text-zinc-400"
                  >
                    暂无物料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </A4LandscapePage>
      );
    }

    case "size":
      return (
        <A4LandscapePage
          meta={meta}
          sectionTitle={`尺寸表（cm）${page.sampleSize ? ` · 基准 ${page.sampleSize}` : ""}`}
          pageLabel={
            page.pageCount > 1
              ? `${page.pageIndex}/${page.pageCount}`
              : undefined
          }
          screenChrome={screenChrome}
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
