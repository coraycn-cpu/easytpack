import type { Hotspot } from "@/types/process";
import {
  DEFAULT_ARTBOARD_NAMES,
  type Artboard,
  type CanvasData,
  type LegacyCanvasData,
  type TechPackProject,
} from "@/types/project";

const STAGE_W = 800;
const STAGE_H = 600;

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
    const stageArea = STAGE_W * STAGE_H;

    // 排除画面上方 18%（常见人脸区域）
    if (cy < STAGE_H * 0.18) return false;
    // 排除过小或过大
    if (area < 400 || area > stageArea * 0.35) return false;
    // 排除极扁/极竖的异常框
    const ratio = hs.width / (hs.height || 1);
    if (ratio > 8 || ratio < 0.12) return false;
    // 排除居中偏上的小块（常见误标脸部）
    if (cy < STAGE_H * 0.28 && hs.width < STAGE_W * 0.25) return false;

    return cx > 0 && cy > 0 && cx < STAGE_W && cy < STAGE_H;
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

/** 品类热区模板（800×600 画布坐标） */
export function getCategoryHotspotTemplate(category?: string): TemplateHotspot[] {
  const c = (category ?? "").toLowerCase();

  if (c.includes("马甲") || c.includes("vest")) {
    return [
      { label: "领口", x: 340, y: 95, width: 120, height: 70 },
      { label: "前门襟", x: 370, y: 165, width: 60, height: 200 },
      { label: "肩缝", x: 260, y: 130, width: 90, height: 50 },
      { label: "袖笼", x: 220, y: 175, width: 70, height: 80 },
      { label: "口袋", x: 280, y: 280, width: 100, height: 70 },
      { label: "下摆", x: 250, y: 400, width: 300, height: 50 },
    ];
  }

  if (c.includes("裤") || c.includes("short")) {
    return [
      { label: "腰头", x: 280, y: 120, width: 240, height: 45 },
      { label: "门襟", x: 370, y: 165, width: 60, height: 100 },
      { label: "侧缝", x: 250, y: 200, width: 50, height: 250 },
      { label: "脚口", x: 270, y: 460, width: 260, height: 40 },
    ];
  }

  if (c.includes("衬衫") || c.includes("shirt")) {
    return [
      { label: "领座", x: 340, y: 80, width: 120, height: 60 },
      { label: "袖窿", x: 200, y: 150, width: 80, height: 90 },
      { label: "袖口", x: 130, y: 380, width: 70, height: 50 },
      { label: "前门襟", x: 375, y: 140, width: 50, height: 280 },
      { label: "下摆", x: 260, y: 430, width: 280, height: 45 },
    ];
  }

  // 默认 T 恤 / 针织
  return [
    { label: "领口", x: 330, y: 90, width: 140, height: 65 },
    { label: "肩缝", x: 250, y: 145, width: 100, height: 45 },
    { label: "袖口", x: 140, y: 350, width: 75, height: 55 },
    { label: "侧缝", x: 230, y: 220, width: 45, height: 220 },
    { label: "下摆", x: 260, y: 440, width: 280, height: 45 },
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
  const filtered = filterHotspots(aiHotspots, { category });
  if (filtered.length >= 3) return filtered;
  return applyHotspotTemplate(category, "hs_merged");
}
