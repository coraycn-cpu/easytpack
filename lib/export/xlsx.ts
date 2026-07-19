import * as XLSX from "xlsx";
import {
  downloadBlob,
  exportFilename,
} from "@/lib/export/filename";
import { buildDocMeta } from "@/lib/export/techpack-document";
import type { TechPackProject } from "@/types/project";

/** 一个 xlsx 文件，多 Sheet */
export function exportTechPackXlsx(project: TechPackProject) {
  const meta = buildDocMeta(project);
  const wb = XLSX.utils.book_new();

  const coverRows = [
    ["字段", "内容"],
    ["款式", meta.targetLabel],
    ["标题", meta.title],
    ["品类", meta.category],
    ["款号", meta.styleNo],
    ["日期", meta.date],
    ["状态", meta.workflow],
    ["尺码段", meta.sizeRange],
    ["面料提示", meta.materialsHint],
    ["描述", meta.description],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(coverRows),
    "封面信息",
  );

  const processAoa: (string | number)[][] = [
    ["序号", "部位", "工艺描述", "针法", "缝份"],
    ...project.process_items.map((item, i) => [
      i + 1,
      item.part ?? "",
      item.process ?? "",
      item.stitch ?? "",
      item.seam_allowance ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(processAoa),
    "工艺",
  );

  const bomAoa: string[][] = [
    ["物料名称", "部件", "分类", "规格", "颜色", "用量", "供应商", "编码"],
    ...project.bom_items.map((item) => [
      item.name ?? "",
      item.garmentPart ?? "",
      item.category ?? "",
      item.spec ?? "",
      item.color ?? "",
      item.usage ?? "",
      item.supplier ?? "",
      item.code ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bomAoa), "BOM");

  const sizes = project.size_chart.sizes ?? [];
  const sizeAoa: string[][] = [
    ["部位", "量法", ...sizes],
    ...project.size_chart.rows.map((row) => [
      row.part,
      row.method,
      ...sizes.map((s) => row.values[s] ?? ""),
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(sizeAoa),
    "尺寸",
  );

  const reviewAoa = [
    ["款式评语"],
    [project.style_review?.trim() || ""],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(reviewAoa),
    "评语",
  );

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, exportFilename(project, "工艺包.xlsx"));
}
