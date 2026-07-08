import type { Hotspot } from "@/types/process";
import {
  DEFAULT_ARTBOARD_NAMES,
  type Artboard,
  type CanvasData,
  type LegacyCanvasData,
  type TechPackProject,
} from "@/types/project";

import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";

export function createArtboard(
  name: string,
  imageDataUrl?: string,
  hotspots: Hotspot[] = [],
): Artboard {
  return {
    id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    imageDataUrl,
    hotspots,
    annotations: [],
  };
}

export function createDefaultCanvasData(
  imageDataUrl?: string,
  hotspots: Hotspot[] = [],
): CanvasData {
  const front = createArtboard(DEFAULT_ARTBOARD_NAMES[0], imageDataUrl, hotspots);
  return {
    artboards: [
      front,
      createArtboard(DEFAULT_ARTBOARD_NAMES[1]),
      createArtboard(DEFAULT_ARTBOARD_NAMES[2]),
    ],
    activeArtboardId: front.id,
  };
}

export function migrateProject(project: TechPackProject): TechPackProject {
  const legacy = project.canvas_data as CanvasData & LegacyCanvasData;
  if (legacy.artboards?.length) {
    return {
      ...project,
      workflowStatus: project.workflowStatus ?? "draft",
    };
  }

  const hotspots = legacy.hotspots ?? [];
  return {
    ...project,
    workflowStatus: project.workflowStatus ?? "draft",
    canvas_data: createDefaultCanvasData(
      project.intake.imageDataUrl,
      hotspots,
    ),
  };
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

/** 过滤 AI 热区：去除面部区域、过大过小、重叠框，限制数量 */
export function filterHotspots(
  hotspots: Hotspot[],
  options?: { maxCount?: number; category?: string },
): Hotspot[] {
  const maxCount = options?.maxCount ?? 8;

  let filtered = hotspots.filter((hs) => {
    const cx = hs.x + hs.width / 2;
    const cy = hs.y + hs.height / 2;
    const area = hs.width * hs.height;
    const stageArea = CANVAS_W * CANVAS_H;

    // 排除画面上方 18%（常见人脸区域）
    if (cy < CANVAS_H * 0.18) return false;
    // 排除过小或过大
    if (area < 600 || area > stageArea * 0.35) return false;
    // 排除极扁/极竖的异常框
    const ratio = hs.width / (hs.height || 1);
    if (ratio > 8 || ratio < 0.12) return false;
    // 排除居中偏上的小块（常见误标脸部）
    if (cy < CANVAS_H * 0.28 && hs.width < CANVAS_W * 0.25) return false;

    return cx > 0 && cy > 0 && cx < CANVAS_W && cy < CANVAS_H;
  });

  // 去重叠：保留面积较大的
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

type TemplateHotspot = Omit<Hotspot, "id">;

function scaleCoord(v: number, base = 800) {
  return Math.round(v * (CANVAS_W / base));
}

function scaleHotspotFromLegacy(hs: Hotspot): Hotspot {
  return {
    ...hs,
    x: scaleCoord(hs.x),
    y: scaleCoord(hs.y, 600),
    width: scaleCoord(hs.width),
    height: scaleCoord(hs.height, 600),
  };
}

/** 品类热区模板（基于 CANVAS_W×CANVAS_H） */
export function getCategoryHotspotTemplate(category?: string): TemplateHotspot[] {
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

export function applyHotspotTemplate(
  category: string | undefined,
  prefix = "hs_tpl",
): Hotspot[] {
  return getCategoryHotspotTemplate(category).map((hs, i) => ({
    ...hs,
    id: `${prefix}_${i}_${Date.now()}`,
  }));
}

export function mergeHotspots(
  aiHotspots: Hotspot[],
  category?: string,
): Hotspot[] {
  const scaled = aiHotspots.map(scaleHotspotFromLegacy);
  const filtered = filterHotspots(scaled, { category });
  if (filtered.length >= 3) return filtered;
  return applyHotspotTemplate(category, "hs_merged");
}
