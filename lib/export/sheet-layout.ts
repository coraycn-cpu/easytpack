import type { BomItem, ProcessItem } from "@/types/process";
import type { SizeChart, TechPackProject } from "@/types/project";
import { normalizeProcessItemsForExport } from "@/lib/export/normalize-process";

const SECTION_GAP = 28;
const TABLE_PAD = 12;
const ROW_H = 28;
const HEADER_H = 30;
const TITLE_H = 22;
const FONT = "12px sans-serif";
const FONT_BOLD = "600 12px sans-serif";
const FONT_TITLE = "600 14px sans-serif";
const MIN_SHEET_W = 960;

export type SheetSection = {
  id: string;
  title: string;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => void;
};

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const t = text?.trim() || "—";
  if (ctx.measureText(t).width <= maxWidth) return t;
  let out = t;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 8,
): string[] {
  const raw = (text ?? "").trim() || "—";
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  const push = (s: string) => {
    if (lines.length < maxLines) lines.push(s);
  };
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
    } else {
      if (cur) push(cur);
      if (ctx.measureText(w).width <= maxWidth) {
        cur = w;
      } else {
        // hard break long token
        let chunk = "";
        for (const ch of w) {
          const tryChunk = chunk + ch;
          if (ctx.measureText(tryChunk).width <= maxWidth) chunk = tryChunk;
          else {
            if (chunk) push(chunk);
            chunk = ch;
          }
        }
        cur = chunk;
      }
    }
  }
  if (cur) push(cur);
  if (lines.length === 0) lines.push("—");
  return lines;
}

type Col = { label: string; width: number; get: (row: number) => string };

function measureSimpleTable(rowCount: number): number {
  return TITLE_H + 8 + HEADER_H + Math.max(1, rowCount) * ROW_H + TABLE_PAD;
}

function drawSimpleTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  cols: Col[],
  rowCount: number,
) {
  let cy = y;
  ctx.fillStyle = "#334155";
  ctx.font = FONT_TITLE;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, x, cy);
  cy += TITLE_H + 8;

  const tableTop = cy;
  const tableH = HEADER_H + Math.max(1, rowCount) * ROW_H;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x, tableTop, width, HEADER_H);
  ctx.strokeRect(x, tableTop, width, tableH);

  let colX = x;
  ctx.font = FONT_BOLD;
  ctx.fillStyle = "#64748b";
  for (const col of cols) {
    ctx.fillText(col.label, colX + 8, tableTop + 9);
    colX += col.width;
  }

  // vertical lines
  colX = x;
  for (let i = 0; i < cols.length - 1; i++) {
    colX += cols[i].width;
    ctx.beginPath();
    ctx.moveTo(colX, tableTop);
    ctx.lineTo(colX, tableTop + tableH);
    ctx.stroke();
  }

  ctx.font = FONT;
  for (let r = 0; r < rowCount; r++) {
    const rowY = tableTop + HEADER_H + r * ROW_H;
    ctx.beginPath();
    ctx.moveTo(x, rowY);
    ctx.lineTo(x + width, rowY);
    ctx.stroke();

    let cx = x;
    ctx.fillStyle = "#0f172a";
    for (const col of cols) {
      const cell = ellipsize(ctx, col.get(r), col.width - 16);
      ctx.fillText(cell, cx + 8, rowY + 8);
      cx += col.width;
    }
  }
}

function buildProcessSection(
  items: ProcessItem[],
  sheetWidth: number,
): SheetSection | null {
  if (!items.length) return null;
  const cols: Col[] = [
    { label: "序号", width: 48, get: (r) => String(r + 1) },
    { label: "部位", width: Math.floor(sheetWidth * 0.16), get: (r) => items[r]?.part ?? "" },
    {
      label: "工艺描述",
      width: Math.floor(sheetWidth * 0.42),
      get: (r) => items[r]?.process ?? "",
    },
    {
      label: "针法",
      width: Math.floor(sheetWidth * 0.16),
      get: (r) => items[r]?.stitch ?? "—",
    },
    {
      label: "缝份",
      width: 0,
      get: (r) => items[r]?.seam_allowance ?? "—",
    },
  ];
  const used = cols.slice(0, -1).reduce((s, c) => s + c.width, 0);
  cols[cols.length - 1].width = Math.max(80, sheetWidth - used);

  return {
    id: "process",
    title: "结构工艺表",
    height: measureSimpleTable(items.length),
    draw: (ctx, x, y, width) =>
      drawSimpleTable(ctx, x, y, width, "结构工艺表", cols, items.length),
  };
}

function buildBomSection(items: BomItem[], sheetWidth: number): SheetSection | null {
  if (!items.length) return null;
  const cols: Col[] = [
    { label: "物料", width: Math.floor(sheetWidth * 0.22), get: (r) => items[r]?.name ?? "" },
    {
      label: "部件",
      width: Math.floor(sheetWidth * 0.12),
      get: (r) => items[r]?.garmentPart ?? "—",
    },
    {
      label: "规格",
      width: Math.floor(sheetWidth * 0.18),
      get: (r) => items[r]?.spec ?? "—",
    },
    {
      label: "颜色",
      width: Math.floor(sheetWidth * 0.12),
      get: (r) => items[r]?.color ?? "—",
    },
    {
      label: "用量",
      width: Math.floor(sheetWidth * 0.12),
      get: (r) => items[r]?.usage ?? "—",
    },
    { label: "编码", width: 0, get: (r) => items[r]?.code ?? "—" },
  ];
  const used = cols.slice(0, -1).reduce((s, c) => s + c.width, 0);
  cols[cols.length - 1].width = Math.max(80, sheetWidth - used);

  return {
    id: "bom",
    title: "面辅料清单 BOM",
    height: measureSimpleTable(items.length),
    draw: (ctx, x, y, width) =>
      drawSimpleTable(ctx, x, y, width, "面辅料清单 BOM", cols, items.length),
  };
}

function buildSizeSection(chart: SizeChart, sheetWidth: number): SheetSection | null {
  if (!chart.rows.length) return null;
  const sizes = chart.sizes.length ? chart.sizes : ["—"];
  const fixed = Math.floor(sheetWidth * 0.18) + Math.floor(sheetWidth * 0.22);
  const sizeColW = Math.max(
    44,
    Math.floor((sheetWidth - fixed) / Math.max(1, sizes.length)),
  );
  const cols: Col[] = [
    {
      label: "部位",
      width: Math.floor(sheetWidth * 0.18),
      get: (r) => chart.rows[r]?.part ?? "",
    },
    {
      label: "量法",
      width: Math.floor(sheetWidth * 0.22),
      get: (r) => chart.rows[r]?.method ?? "",
    },
    ...sizes.map(
      (s): Col => ({
        label: s,
        width: sizeColW,
        get: (r) => chart.rows[r]?.values?.[s] ?? "—",
      }),
    ),
  ];
  // normalize last col to fill
  const used = cols.reduce((s, c) => s + c.width, 0);
  if (used < sheetWidth && cols.length) {
    cols[cols.length - 1].width += sheetWidth - used;
  }

  const titleExtra = chart.sampleSize
    ? `尺寸表（样衣码 ${chart.sampleSize}，单位：cm）`
    : "尺寸表（单位：cm）";

  return {
    id: "size",
    title: titleExtra,
    height: measureSimpleTable(chart.rows.length),
    draw: (ctx, x, y, width) =>
      drawSimpleTable(ctx, x, y, width, titleExtra, cols, chart.rows.length),
  };
}

function buildRemarksSection(text: string, sheetWidth: number): SheetSection | null {
  const body = text.trim();
  if (!body) return null;

  // measure with a temp approach using average line height
  const lineH = 18;
  const maxTextW = sheetWidth - 24;
  // approximate lines via canvas will be done in draw; estimate generously
  const approxCharsPerLine = Math.max(20, Math.floor(maxTextW / 7));
  const approxLines = Math.min(12, Math.max(2, Math.ceil(body.length / approxCharsPerLine)));
  const height = TITLE_H + 8 + approxLines * lineH + TABLE_PAD + 16;

  return {
    id: "remarks",
    title: "备注 REMARKS",
    height,
    draw: (ctx, x, y, width) => {
      ctx.fillStyle = "#334155";
      ctx.font = FONT_TITLE;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("备注 REMARKS", x, y);

      const boxY = y + TITLE_H + 8;
      ctx.font = FONT;
      const lines = wrapLines(ctx, body, width - 24, 12);
      const boxH = lines.length * lineH + 16;
      ctx.strokeStyle = "#e2e8f0";
      ctx.strokeRect(x, boxY, width, boxH);
      ctx.fillStyle = "#0f172a";
      lines.forEach((line, i) => {
        ctx.fillText(line, x + 12, boxY + 8 + i * lineH);
      });
    },
  };
}

export function buildSheetSections(
  project: Pick<
    TechPackProject,
    "process_items" | "bom_items" | "size_chart" | "style_review" | "title" | "intake"
  >,
  sheetWidth: number,
): SheetSection[] {
  const w = Math.max(MIN_SHEET_W, sheetWidth);
  const sections: SheetSection[] = [];
  const process = buildProcessSection(
    normalizeProcessItemsForExport(project.process_items),
    w,
  );
  const bom = buildBomSection(project.bom_items, w);
  const size = buildSizeSection(project.size_chart, w);
  const remarks = buildRemarksSection(project.style_review ?? "", w);
  if (process) sections.push(process);
  if (bom) sections.push(bom);
  if (size) sections.push(size);
  if (remarks) sections.push(remarks);
  return sections;
}

export function measureSheetSectionsHeight(sections: SheetSection[]): number {
  if (!sections.length) return 0;
  return (
    SECTION_GAP +
    sections.reduce((sum, s, i) => sum + s.height + (i > 0 ? SECTION_GAP : 0), 0) +
    SECTION_GAP
  );
}

export function drawSheetSections(
  ctx: CanvasRenderingContext2D,
  sections: SheetSection[],
  x: number,
  startY: number,
  width: number,
): number {
  let y = startY + SECTION_GAP;
  for (const section of sections) {
    section.draw(ctx, x, y, width);
    y += section.height + SECTION_GAP;
  }
  return y;
}

export { MIN_SHEET_W, SECTION_GAP };
