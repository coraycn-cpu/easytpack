import type { Hotspot } from "@/types/process";
import { migrateAnnotationLinks } from "@/lib/canvas/migrate";
import { ensureProcessItemIds } from "@/lib/process/ids";
import {
  DEFAULT_ARTBOARD_NAMES,
  type Annotation,
  type Artboard,
  type CanvasData,
  type LegacyCanvasData,
  type TechPackProject,
} from "@/types/project";

import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";

import { AI_ANNOTATION_COLOR } from "@/lib/canvas/annotation-colors";

export const PART_ANNOTATION_COLOR = AI_ANNOTATION_COLOR;

export function hotspotToAnnotation(hs: Hotspot): Annotation {
  return {
    id: hs.id.startsWith("hs_") ? hs.id.replace(/^hs_/, "ann_") : `ann_${hs.id}`,
    type: "rect",
    color: PART_ANNOTATION_COLOR,
    strokeWidth: 2,
    x: hs.x,
    y: hs.y,
    width: hs.width,
    height: hs.height,
    text: hs.label,
    linkedPart: hs.label,
  };
}

/** 将旧热区合并进 annotations 并清除 hotspots */
export function migrateArtboardHotspots(artboard: Artboard): Artboard {
  const legacy = artboard.hotspots ?? [];
  if (legacy.length === 0) {
    const { hotspots: _h, ...rest } = artboard;
    return rest as Artboard;
  }
  const existingIds = new Set(artboard.annotations.map((a) => a.id));
  const migrated = legacy
    .map(hotspotToAnnotation)
    .filter((a) => !existingIds.has(a.id));
  const { hotspots: _h, ...rest } = artboard;
  return {
    ...rest,
    annotations: [...artboard.annotations, ...migrated],
  };
}

export function createArtboard(
  name: string,
  imageDataUrl?: string,
  annotations: Annotation[] = [],
): Artboard {
  return {
    id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    imageDataUrl,
    annotations,
  };
}

export function createDefaultCanvasData(
  imageDataUrl?: string,
  annotations: Annotation[] = [],
): CanvasData {
  const front = createArtboard(DEFAULT_ARTBOARD_NAMES[0], imageDataUrl, annotations);
  return {
    artboards: [front],
    activeArtboardId: front.id,
  };
}

export function migrateProject(project: TechPackProject): TechPackProject {
  const legacy = project.canvas_data as CanvasData & LegacyCanvasData;
  let canvas_data: CanvasData;

  if (legacy.artboards?.length) {
    canvas_data = {
      ...project.canvas_data,
      artboards: project.canvas_data.artboards.map(migrateArtboardHotspots),
    };
  } else {
    const legacyHotspots = legacy.hotspots ?? [];
    canvas_data = createDefaultCanvasData(
      project.intake.imageDataUrl,
      legacyHotspots.map(hotspotToAnnotation),
    );
  }

  return migrateAnnotationLinks({
    ...project,
    workflowStatus: project.workflowStatus ?? "draft",
    canvas_data,
    process_items: ensureProcessItemIds(
      project.process_items.map(({ hotspotId: _id, ...item }) => item),
    ),
  });
}

function overlapRatio(a: Hotspot, b: Hotspot): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const areaA = a.width * a.height;
  return areaA > 0 ? inter / areaA : 0;
}

import type { PhotoType } from "@/types/project";

function filterSuggestedRegions(
  regions: Hotspot[],
  options?: { maxCount?: number; category?: string; photoType?: PhotoType },
): Hotspot[] {
  const maxCount = options?.maxCount ?? 8;
  const isModel = options?.photoType === "model";
  const topCutoff = isModel ? 0.22 : 0.18;
  const maxAreaRatio = isModel ? 0.25 : 0.35;

  let filtered = regions.filter((hs) => {
    const cx = hs.x + hs.width / 2;
    const cy = hs.y + hs.height / 2;
    const area = hs.width * hs.height;
    const stageArea = CANVAS_W * CANVAS_H;

    if (cy < CANVAS_H * topCutoff) return false;
    if (area < 600 || area > stageArea * maxAreaRatio) return false;
    const ratio = hs.width / (hs.height || 1);
    if (ratio > 8 || ratio < 0.12) return false;
    if (cy < CANVAS_H * 0.28 && hs.width < CANVAS_W * 0.25) return false;

    return cx > 0 && cy > 0 && cx < CANVAS_W && cy < CANVAS_H;
  });

  filtered = filtered.filter((hs, i) => {
    for (let j = 0; j < filtered.length; j++) {
      if (i === j) continue;
      if (overlapRatio(hs, filtered[j]) > 0.55) {
        const areaI = hs.width * hs.height;
        const areaJ = filtered[j].width * filtered[j].height;
        if (areaI < areaJ) return false;
      }
    }
    return true;
  });

  return filtered.slice(0, maxCount);
}

type TemplateRegion = Omit<Hotspot, "id">;

function scaleCoord(v: number, base = 800) {
  return Math.round(v * (CANVAS_W / base));
}

function scaleRegionFromLegacy(hs: Hotspot): Hotspot {
  return {
    ...hs,
    x: scaleCoord(hs.x),
    y: scaleCoord(hs.y, 600),
    width: scaleCoord(hs.width),
    height: scaleCoord(hs.height, 600),
  };
}

function getCategoryPartTemplate(category?: string): TemplateRegion[] {
  const c = (category ?? "").toLowerCase();
  const s = scaleCoord;

  if (c.includes("马甲") || c.includes("vest")) {
    return [
      { label: "领口", x: s(340), y: s(95, 600), width: s(120), height: s(70, 600) },
      { label: "前门襟", x: s(370), y: s(165, 600), width: s(60), height: s(200, 600) },
      { label: "肩缝", x: s(260), y: s(130, 600), width: s(90), height: s(50, 600) },
      { label: "袖笼", x: s(220), y: s(175, 600), width: s(70), height: s(80, 600) },
      { label: "口袋", x: s(280), y: s(280, 600), width: s(100), height: s(70, 600) },
      { label: "下摆", x: s(250), y: s(400, 600), width: s(300), height: s(50, 600) },
    ];
  }

  if (c.includes("裤") || c.includes("short")) {
    return [
      { label: "腰头", x: s(280), y: s(120, 600), width: s(240), height: s(45, 600) },
      { label: "门襟", x: s(370), y: s(165, 600), width: s(60), height: s(100, 600) },
      { label: "侧缝", x: s(250), y: s(200, 600), width: s(50), height: s(250, 600) },
      { label: "脚口", x: s(270), y: s(460, 600), width: s(260), height: s(40, 600) },
    ];
  }

  if (c.includes("衬衫") || c.includes("shirt")) {
    return [
      { label: "领座", x: s(340), y: s(80, 600), width: s(120), height: s(60, 600) },
      { label: "袖窿", x: s(200), y: s(150, 600), width: s(80), height: s(90, 600) },
      { label: "袖口", x: s(130), y: s(380, 600), width: s(70), height: s(50, 600) },
      { label: "前门襟", x: s(375), y: s(140, 600), width: s(50), height: s(280, 600) },
      { label: "下摆", x: s(260), y: s(430, 600), width: s(280), height: s(45, 600) },
    ];
  }

  return [
    { label: "领口", x: s(330), y: s(90, 600), width: s(140), height: s(65, 600) },
    { label: "肩缝", x: s(250), y: s(145, 600), width: s(100), height: s(45, 600) },
    { label: "袖口", x: s(140), y: s(350, 600), width: s(75), height: s(55, 600) },
    { label: "侧缝", x: s(230), y: s(220, 600), width: s(45), height: s(220, 600) },
    { label: "下摆", x: s(260), y: s(440, 600), width: s(280), height: s(45, 600) },
  ];
}

function regionsToAnnotations(regions: TemplateRegion[], prefix: string): Annotation[] {
  const ts = Date.now();
  return regions.map((r, i) =>
    hotspotToAnnotation({
      ...r,
      id: `${prefix}_${i}_${ts}`,
    }),
  );
}

/** AI 建议部位 → 标注（Collect 流程） */
export function mergeSuggestedPartAnnotations(
  aiRegions: Hotspot[],
  category?: string,
  photoType?: PhotoType,
): Annotation[] {
  const scaled = aiRegions.map(scaleRegionFromLegacy);
  const filtered = filterSuggestedRegions(scaled, { category, photoType });
  const regions =
    filtered.length >= 3
      ? filtered
      : getCategoryPartTemplate(category).map((r, i) => ({
          ...r,
          id: `tpl_${i}`,
        }));
  return regionsToAnnotations(regions, "ann_ai");
}
