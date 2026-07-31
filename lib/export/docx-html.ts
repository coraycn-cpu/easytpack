import {
  downloadBlob,
  exportFilename,
} from "@/lib/export/filename";
import { sanitizeExportReview } from "@/lib/export/client-facing-copy";
import { normalizeProcessItemsForExport } from "@/lib/export/normalize-process";
import {
  buildDocMeta,
  type AnnotatedImage,
} from "@/lib/export/techpack-document";
import type { ExportLocale } from "@/lib/export/en-overlay";
import type { TechPackProject } from "@/types/project";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Word 可用版：导出 HTML 格式的 .doc（Word / WPS 可直接打开）。
 * 不含复杂排版；后续可再换真正 docx 库。
 */
export async function exportTechPackWordDoc(
  project: TechPackProject,
  annotatedImages: AnnotatedImage[] = [],
  options?: { locale?: ExportLocale },
) {
  const locale: ExportLocale = options?.locale ?? "zh";
  const en = locale === "en";
  const meta = buildDocMeta(project, locale);
  const processItems = normalizeProcessItemsForExport(project.process_items);
  const review = sanitizeExportReview(project.style_review || "");
  const sizes = project.size_chart?.sizes ?? [];
  const rows = project.size_chart?.rows ?? [];

  const imgBlocks = annotatedImages
    .slice(0, 8)
    .map(
      (img) =>
        `<h3>${esc(img.name || (en ? "View" : "视图"))}</h3>` +
        (img.dataUrl
          ? `<p><img src="${img.dataUrl}" style="max-width:520px;height:auto;" /></p>`
          : ""),
    )
    .join("\n");

  const processTable =
    `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">` +
    `<tr><th>${en ? "Part" : "部位"}</th><th>${en ? "Process" : "工艺"}</th><th>${en ? "Stitch" : "针法"}</th><th>${en ? "Seam" : "缝份"}</th></tr>` +
    processItems
      .map(
        (it) =>
          `<tr><td>${esc(it.part)}</td><td>${esc(it.process)}</td><td>${esc(it.stitch || "")}</td><td>${esc(it.seam_allowance || "")}</td></tr>`,
      )
      .join("") +
    `</table>`;

  const bomTable =
    `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">` +
    `<tr><th>${en ? "Name" : "名称"}</th><th>${en ? "Spec" : "规格"}</th><th>${en ? "Color" : "颜色"}</th><th>${en ? "Usage" : "用量"}</th></tr>` +
    (project.bom_items || [])
      .map(
        (it) =>
          `<tr><td>${esc(it.name)}</td><td>${esc(it.spec || "")}</td><td>${esc(it.color || "")}</td><td>${esc(it.usage || "")}</td></tr>`,
      )
      .join("") +
    `</table>`;

  const sizeHead =
    `<tr><th>${en ? "Part" : "部位"}</th>` +
    sizes.map((s) => `<th>${esc(s)}</th>`).join("") +
    `</tr>`;
  const sizeBody = rows
    .map((r) => {
      const vals = sizes.map((s) => `<td>${esc(String(r.values?.[s] ?? ""))}</td>`).join("");
      return `<tr><td>${esc(r.part)}</td>${vals}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${esc(meta.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
body{font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;font-size:12px;color:#1f2937;}
h1{font-size:20px;} h2{font-size:14px;margin-top:18px;}
table{margin:8px 0;} th{background:#f3f4f6;}
</style>
</head>
<body>
<h1>${esc(meta.title)}</h1>
<p>${en ? "Style" : "款号"}: ${esc(meta.styleNo)} · ${en ? "Category" : "品类"}: ${esc(meta.category)} · ${esc(meta.date)}</p>
<p>${en ? "Size range" : "尺码范围"}: ${esc(meta.sizeRange)} · ${en ? "Status" : "状态"}: ${esc(meta.workflow)}</p>
${meta.materialsHint ? `<p>${en ? "Fabric" : "面料提示"}: ${esc(meta.materialsHint)}</p>` : ""}
<h2>${en ? "Views" : "款式图"}</h2>
${imgBlocks || `<p>${en ? "No images" : "暂无图"}</p>`}
<h2>${en ? "Process" : "工艺"}</h2>
${processTable}
<h2>${en ? "BOM" : "物料"}</h2>
${bomTable}
<h2>${en ? "Measurements" : "尺寸表"}</h2>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">
${sizeHead}${sizeBody}
</table>
${review ? `<h2>${en ? "Notes" : "评语"}</h2><p style="white-space:pre-wrap;">${esc(review)}</p>` : ""}
</body></html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  downloadBlob(
    blob,
    exportFilename(project, en ? "TechPack-EN.doc" : "工艺包.doc"),
  );
}
