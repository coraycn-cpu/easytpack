import ExcelJS from "exceljs";
import {
  downloadBlob,
  exportFilename,
} from "@/lib/export/filename";
import { normalizeProcessItemsForExport } from "@/lib/export/normalize-process";
import {
  buildDocMeta,
  type AnnotatedImage,
} from "@/lib/export/techpack-document";
import type { TechPackProject } from "@/types/project";

function parseDataUrl(dataUrl: string): {
  base64: string;
  extension: "png" | "jpeg";
} | null {
  const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  return {
    extension: raw === "png" ? "png" : "jpeg",
    base64: m[2],
  };
}

/** 估算嵌入图在表中的显示尺寸（保持比例，限制长边） */
function displaySize(
  dataUrl: string,
  maxW = 520,
  maxH = 390,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
      resolve({
        width: Math.max(80, Math.round(img.naturalWidth * scale)),
        height: Math.max(60, Math.round(img.naturalHeight * scale)),
      });
    };
    img.onerror = () => resolve({ width: maxW, height: maxH });
    img.src = dataUrl;
  });
}

/** 一个 xlsx 文件：封面 / 视图（含图）/ 工艺 / BOM / 尺寸 / 评语 */
export async function exportTechPackXlsx(
  project: TechPackProject,
  annotatedImages: AnnotatedImage[] = [],
) {
  const meta = buildDocMeta(project);
  const wb = new ExcelJS.Workbook();
  wb.creator = "EasytPack";
  wb.created = new Date();

  const cover = wb.addWorksheet("封面信息");
  cover.getColumn(1).width = 14;
  cover.getColumn(2).width = 48;
  cover.addRow(["字段", "内容"]).font = { bold: true };
  const coverRows: [string, string][] = [
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
  coverRows.forEach(([field, value]) => cover.addRow([field, value]));

  const views = annotatedImages.length
    ? annotatedImages
    : project.intake.imageDataUrl
      ? [{ name: "参考图", dataUrl: project.intake.imageDataUrl }]
      : [];

  if (views.length > 0) {
    const viewSheet = wb.addWorksheet("视图");
    viewSheet.getColumn(1).width = 18;
    viewSheet.getColumn(2).width = 72;

    let row = 1;
    for (const view of views) {
      viewSheet.getCell(row, 1).value = view.name;
      viewSheet.getCell(row, 1).font = { bold: true };
      row += 1;

      const parsed = parseDataUrl(view.dataUrl);
      if (parsed) {
        const size = await displaySize(view.dataUrl);
        const imageId = wb.addImage({
          base64: parsed.base64,
          extension: parsed.extension,
        });
        // exceljs 行高单位约 pt；按图高预留行距
        const rowsNeeded = Math.max(12, Math.ceil(size.height / 18) + 1);
        viewSheet.addImage(imageId, {
          tl: { col: 0, row: row - 1 },
          ext: { width: size.width, height: size.height },
        });
        row += rowsNeeded;
      } else {
        viewSheet.getCell(row, 1).value = "（图片格式无法写入）";
        row += 2;
      }
      row += 1;
    }
  }

  const processSheet = wb.addWorksheet("工艺");
  processSheet.addRow(["序号", "部位", "工艺描述", "针法", "缝份"]);
  const processItems = normalizeProcessItemsForExport(project.process_items);
  processItems.forEach((item, i) => {
    processSheet.addRow([
      i + 1,
      item.part ?? "",
      item.process ?? "",
      item.stitch ?? "",
      item.seam_allowance ?? "",
    ]);
  });
  processSheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 40 },
    { width: 12 },
    { width: 10 },
  ];

  const bomSheet = wb.addWorksheet("BOM");
  bomSheet.addRow([
    "物料名称",
    "部件",
    "分类",
    "规格",
    "颜色",
    "用量",
    "供应商",
    "编码",
  ]);
  project.bom_items.forEach((item) => {
    bomSheet.addRow([
      item.name ?? "",
      item.garmentPart ?? "",
      item.category ?? "",
      item.spec ?? "",
      item.color ?? "",
      item.usage ?? "",
      item.supplier ?? "",
      item.code ?? "",
    ]);
  });
  bomSheet.columns = [
    { width: 18 },
    { width: 12 },
    { width: 10 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
  ];

  const sizes = project.size_chart.sizes ?? [];
  const sizeSheet = wb.addWorksheet("尺寸");
  sizeSheet.addRow(["部位", "量法", ...sizes]);
  project.size_chart.rows.forEach((r) => {
    sizeSheet.addRow([r.part, r.method, ...sizes.map((s) => r.values[s] ?? "")]);
  });
  sizeSheet.columns = [
    { width: 14 },
    { width: 22 },
    ...sizes.map(() => ({ width: 8 })),
  ];

  const reviewSheet = wb.addWorksheet("评语");
  reviewSheet.getColumn(1).width = 80;
  reviewSheet.addRow(["款式评语"]);
  reviewSheet.addRow([project.style_review?.trim() || ""]);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, exportFilename(project, "工艺包.xlsx"));
}
