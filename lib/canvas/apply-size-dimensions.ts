import { AI_ANNOTATION_COLOR } from "@/lib/canvas/annotation-colors";
import { mapAiAnnotationToCanvas } from "@/lib/canvas/bounds";
import {
  findAnnotationsForSizePart,
  isDimensionAnnotation,
} from "@/lib/canvas/size-annotations";
import {
  canonicalPartKey,
  normalizePartKey,
} from "@/lib/ai/merge-identity";
import type { Annotation, SizeChart } from "@/types/project";

export type AiBatchDimensionLine = {
  part: string;
  x: number;
  y: number;
  x2: number;
  y2: number;
};

const MIN_LINE_LEN = 12;

function aliasKeysFor(part: string): string[] {
  const key = normalizePartKey(part);
  const canonical = canonicalPartKey(part);
  return [...new Set([key, canonical].filter(Boolean))];
}

function resolveSizeRow(
  linePart: string,
  rows: SizeChart["rows"],
): SizeChart["rows"][number] | undefined {
  const keys = aliasKeysFor(linePart);
  for (const r of rows) {
    const rk = canonicalPartKey(r.part);
    if (keys.includes(rk) || keys.includes(normalizePartKey(r.part))) return r;
  }
  for (const r of rows) {
    const rk = normalizePartKey(r.part);
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
    if (p) parts.add(canonicalPartKey(p));
  }
  return parts;
}

export function applyBatchSizeDimensions(
  existingAnnotations: Annotation[],
  aiLines: AiBatchDimensionLine[],
  sizeChart: SizeChart,
  imageFit: { x: number; y: number; width: number; height: number },
  imageOffset: { x: number; y: number },
  /** 项目级已有部位（含其他画板），避免同款多图重复画线 */
  projectLinkedParts?: Iterable<string>,
): { annotations: Annotation[]; added: number; skipped: number } {
  const linked = getLinkedSizeParts(existingAnnotations);
  if (projectLinkedParts) {
    for (const p of projectLinkedParts) {
      const key = canonicalPartKey(p) || normalizePartKey(p);
      if (key) linked.add(key);
    }
  }
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
    const key = canonicalPartKey(linkedPart);
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
