import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import {
  COLLAGE_REFERENCE_NAME,
  findPhotoReferenceArtboard,
  MODEL_REFERENCE_NAME,
} from "@/lib/studio/reference-artboard";
import type { Artboard } from "@/types/project";

const REFERENCE_NAMES = new Set([
  MODEL_REFERENCE_NAME,
  COLLAGE_REFERENCE_NAME,
  "参考图",
]);

function exportRank(ab: Artboard, primaryId?: string, refId?: string): number {
  if (primaryId && ab.id === primaryId) return 0;
  if (refId && ab.id === refId) return 1;
  if (ab.viewImageMeta?.kind === "flat_front") return 2;
  if (ab.viewImageMeta) return 3;
  if (REFERENCE_NAMES.has(ab.name)) return 1;
  return 4;
}

/** 导出预览顺序：主款 → 参考原图 → AI 视角图 → 其余 */
export function sortArtboardsForExport(artboards: Artboard[]): Artboard[] {
  const primaryId = getPrimaryArtboardId(artboards);
  const ref = findPhotoReferenceArtboard(artboards);
  return [...artboards].sort((a, b) => {
    const diff = exportRank(a, primaryId, ref?.id) - exportRank(b, primaryId, ref?.id);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "zh-CN");
  });
}
