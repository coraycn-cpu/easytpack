import type { BomItem, ProcessItem } from "@/types/process";
import type { SizeChart } from "@/types/project";

function escapeCsv(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBomCsv(items: BomItem[], filename = "bom.csv") {
  const headers = ["物料名称", "部件", "分类", "规格", "颜色", "用量", "供应商", "编码"];
  const rows = items.map((item) =>
    [
      item.name,
      item.garmentPart ?? "",
      item.category ?? "",
      item.spec ?? "",
      item.color ?? "",
      item.usage ?? "",
      item.supplier ?? "",
      item.code ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportProcessCsv(items: ProcessItem[], filename = "process.csv") {
  const headers = ["序号", "部位", "工艺描述", "针法", "缝份"];
  const rows = items.map((item, i) =>
    [
      String(i + 1),
      item.part ?? "",
      item.process ?? "",
      item.stitch ?? "",
      item.seam_allowance ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportSizeChartCsv(chart: SizeChart, filename = "size-chart.csv") {
  const headers = ["部位", "量法", ...chart.sizes];
  const rows = chart.rows.map((row) =>
    [row.part, row.method, ...chart.sizes.map((s) => row.values[s] ?? "")]
      .map(escapeCsv)
      .join(","),
  );
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}
