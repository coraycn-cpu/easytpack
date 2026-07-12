import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import {
  ARTBOARD_GAP,
  ARTBOARD_LABEL_HEIGHT,
} from "@/lib/studio/artboard-layout";
import {
  findPhotoReferenceArtboard,
  getPhotoReferenceArtboardName,
  shouldKeepPhotoReference,
} from "@/lib/studio/reference-artboard";
import { createArtboard } from "@/lib/project/hotspots";
import type { Artboard, TechPackProject } from "@/types/project";

/** 与 computeImagePlacement maxDim 一致，用于同步迁移时的画板锚点估算 */
const ESTIMATED_IMAGE_WIDTH = 900;

function estimateNextArtboardOrigin(artboards: Artboard[]): { x: number; y: number } {
  const withImage = artboards.filter((a) => a.imageDataUrl);
  if (withImage.length === 0) {
    return { x: 0, y: ARTBOARD_LABEL_HEIGHT };
  }
  let maxRight = 0;
  for (const ab of withImage) {
    const ox = ab.canvasOrigin?.x ?? 0;
    maxRight = Math.max(maxRight, ox + ESTIMATED_IMAGE_WIDTH);
  }
  return { x: maxRight + ARTBOARD_GAP, y: ARTBOARD_LABEL_HEIGHT };
}

/** 加载/保存时同步补全平铺主款元数据与模特/拼贴参考画板（替代 Studio runtime effect） */
export function migrateCanvasData(project: TechPackProject): TechPackProject {
  const { intake } = project;
  let artboards = [...project.canvas_data.artboards];
  let changed = false;

  const primaryId = getPrimaryArtboardId(artboards);
  if (intake.flatFrontGenerated && primaryId) {
    artboards = artboards.map((ab) => {
      if (ab.id !== primaryId || ab.viewImageMeta) return ab;
      changed = true;
      return { ...ab, viewImageMeta: { kind: "flat_front" as const } };
    });
  }

  if (
    intake.flatFrontGenerated &&
    shouldKeepPhotoReference(intake.photoType) &&
    intake.imageDataUrl?.trim() &&
    !findPhotoReferenceArtboard(artboards)
  ) {
    const refName = getPhotoReferenceArtboardName(intake.photoType);
    if (refName) {
      const ref = createArtboard(refName, intake.imageDataUrl);
      ref.canvasOrigin = estimateNextArtboardOrigin(artboards);
      artboards = [...artboards, ref];
      changed = true;
    }
  }

  if (!changed) return project;
  return {
    ...project,
    canvas_data: { ...project.canvas_data, artboards },
  };
}
