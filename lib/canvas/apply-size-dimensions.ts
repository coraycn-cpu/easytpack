import { AI_ANNOTATION_COLOR } from "@/lib/canvas/annotation-colors";
import { mapAiAnnotationToCanvas } from "@/lib/canvas/bounds";
import {
  findAnnotationsForSizePart,
  isDimensionAnnotation,
} from "@/lib/canvas/size-annotations";
import type { Annotation, SizeChart } from "@/types/project";

export type AiBatchDimensionLine = {
  part: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
};

const MIN_LINE_LEN = 12;

function partKey(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/\s/g, "");
}

/** 常见部位别名，便于 AI 返回「领宽」时匹配尺码表「领口横开」 */
const PART_ALIASES: Record<string, string[]> = {
  领口横开: ["领宽", "领围", "颈宽", "neckwidth", "neck"],
  衣长: ["长度", "全长", "bodylength", "length"],
  胸围: ["胸宽", "chest", "bust"],
  肩宽: ["肩阔", "shoulder"],
  袖长: ["袖子长", "sleeve"],
  袖口: ["袖口宽", "cuff"],
  下摆: ["下摆宽", "hem"],
};

function aliasKeysFor(part: string): string[] {
  const key = partKey(part);
  const keys = new Set<string>([key]);
  for (const [canonical, aliases] of Object.entries(PART_ALIASES)) {
    const ck = partKey(canonical);
    if (key === ck || aliases.some((a) => partKey(a) === key)) {
      keys.add(ck);
      for (const a of aliases) keys.add(partKey(a));
    }
  }
  return [...keys];
}

function resolveSizeRow(
  linePart: string,
  rows: SizeChart["rows"],
): SizeChart["rows"][number] | undefined {
  const keys = aliasKeysFor(linePart);
  for (const r of rows) {
    const rk = partKey(r.part);
    if (keys.includes(rk)) return r;
  }
  for (const r of rows) {
    const rk = partKey(r.part);
    for (const key of keys) {
      if (rk.includes(key) || key.includes(rk)) return r;
    }
  }
  return undefined;
}

export function getLinkedSizeParts(annotations: Annotation[]): Set<string> {
  const parts = new Set<string>();
  for (const ann of annotations) {
    if (!isDimensionAnnotation(ann)) continue;
    const p = ann.linkedSizePart?.trim();
    if (p) parts.add(partKey(p));
  }
  return parts;
}

export function applyBatchSizeDimensions(
  existingAnnotations: Annotation[],
  aiLines: AiBatchDimensionLine[],
  sizeChart: SizeChart,
  imageFit: { x: number; y: number; width: number; height: number },
  imageOffset: { x: number; y: number },
): { annotations: Annotation[]; added: number; skipped: number } {
  const linked = getLinkedSizeParts(existingAnnotations);
  const sampleSize = sizeChart.sampleSize ?? "";

  const newAnnotations: Annotation[] = [...existingAnnotations];
  let added = 0;
  let skipped = 0;

  for (const [i, line] of aiLines.entries()) {
    const row = resolveSizeRow(line.part, sizeChart.rows);
    if (!row) {
      skipped += 1;
      continue;
    }
    const linkedPart = row.part.trim();
    const key = partKey(linkedPart);
    if (!key) {
      skipped += 1;
      continue;
    }
    if (linked.has(key)) {
      skipped += 1;
      continue;
    }
    if (Math.hypot(line.x2 - line.x, line.y2 - line.y) < MIN_LINE_LEN) {
      skipped += 1;
      continue;
    }

    const baseline = sampleSize ? row.values[sampleSize]?.trim() : "";
    const text = baseline ? `${baseline}cm` : undefined;

    const ann = mapAiAnnotationToCanvas(
      {
        type: "dimension",
        x: line.x,
        y: line.y,
        x2: line.x2,
        y2: line.y2,
        color: AI_ANNOTATION_COLOR,
        text,
        linkedSizePart: linkedPart,
      },
      imageFit,
      imageOffset,
      `ann_size_batch_${i}_${Date.now()}`,
    );

    newAnnotations.push(ann);
    linked.add(key);
    added += 1;
  }

  return { annotations: newAnnotations, added, skipped };
}

/** 从项目所有画板收集已有尺寸线关联部位 */
export function collectLinkedSizePartsFromProject(
  artboards: Array<{ annotations: Annotation[] }>,
): string[] {
  const parts = new Set<string>();
  for (const ab of artboards) {
    for (const p of getLinkedSizeParts(ab.annotations)) {
      parts.add(p);
    }
  }
  return [...parts];
}

/** 统计某部位是否已有尺寸线（任意画板） */
export function hasDimensionForPart(
  annotations: Annotation[],
  part: string,
): boolean {
  return findAnnotationsForSizePart(annotations, part).length > 0;
}
