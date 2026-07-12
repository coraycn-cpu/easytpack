import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import { isSetTarget } from "@/lib/ai/garment-scope";
import {
  COLLAGE_REFERENCE_NAME,
  MODEL_REFERENCE_NAME,
} from "@/lib/studio/reference-artboard";
import type { AiLoadingPresetId } from "@/lib/ai/loading-presets";
import type { TechPackProject } from "@/types/project";

export type AiImageSourceKind =
  | "active_artboard"
  | "primary_artboard"
  | "intake_original";

export type AiActionId =
  | "annotate-process"
  | "region-annotate"
  | "size-dimension"
  | "fill-bom"
  | "fill-size"
  | "enhance"
  | "explain"
  | "full-collect"
  | "view-image"
  | "flat-front-regen";

type ProjectSlice = Pick<TechPackProject, "intake" | "canvas_data">;

function artboardLabel(name: string): string {
  const n = name.trim();
  return n || "画板";
}

function isReferenceArtboardName(name: string): boolean {
  return (
    name === MODEL_REFERENCE_NAME ||
    name === COLLAGE_REFERENCE_NAME ||
    name === "参考图"
  );
}

function describeIntakeOriginal(intake: ProjectSlice["intake"]): string {
  if (intake.photoType === "model") return "原参考图（模特穿着）";
  if (intake.photoType === "collage") return "原参考图（拼贴）";
  return "原上传参考图";
}

export function describeArtboardById(
  project: ProjectSlice,
  artboardId?: string,
): { kind: AiImageSourceKind; label: string; artboardId?: string } {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const ab = artboardId
    ? project.canvas_data.artboards.find((a) => a.id === artboardId)
    : undefined;

  if (!ab) {
    return { kind: "intake_original", label: describeIntakeOriginal(project.intake) };
  }

  if (isReferenceArtboardName(ab.name)) {
    return {
      kind: "intake_original",
      label: artboardLabel(ab.name),
      artboardId: ab.id,
    };
  }

  if (ab.id === primaryId) {
    const flat =
      ab.viewImageMeta?.kind === "flat_front" || project.intake.flatFrontGenerated;
    return {
      kind: "primary_artboard",
      label: flat ? `主款平铺「${artboardLabel(ab.name)}」` : `主款「${artboardLabel(ab.name)}」`,
      artboardId: ab.id,
    };
  }

  return {
    kind: "active_artboard",
    label: `当前画板「${artboardLabel(ab.name)}」`,
    artboardId: ab.id,
  };
}

/** 各 AI 功能使用的图片来源（与 resolveGarmentImageForAi 策略一致） */
export function getAiActionImageSource(
  action: AiActionId,
  project: ProjectSlice,
  activeArtboardId?: string,
): { kind: AiImageSourceKind; label: string; hint: string; artboardId?: string } {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const effectiveActive = activeArtboardId ?? primaryId;

  switch (action) {
    case "fill-bom":
    case "enhance": {
      const label = describeIntakeOriginal(project.intake);
      return {
        kind: "intake_original",
        label,
        hint: `本次 AI 基于：${label}（看面料/细节，非当前画板）`,
      };
    }
    case "explain":
    case "full-collect": {
      const src = describeArtboardById(project, primaryId);
      return {
        ...src,
        hint: `本次 AI 基于：${src.label}`,
      };
    }
    case "view-image": {
      const src = describeArtboardById(project, primaryId);
      return {
        ...src,
        hint: `本次 AI 基于：${src.label}（侧栏视角图延伸自主款）`,
      };
    }
    case "flat-front-regen": {
      const label = describeIntakeOriginal(project.intake);
      return {
        kind: "intake_original",
        label,
        hint: `本次 AI 基于：${label}（重新生成主款平铺）`,
      };
    }
    case "annotate-process":
    case "region-annotate":
    case "size-dimension":
    case "fill-size": {
      const src = describeArtboardById(project, effectiveActive);
      const sameAsPrimary = effectiveActive === primaryId;
      return {
        ...src,
        hint: sameAsPrimary
          ? `本次 AI 基于：${src.label}`
          : `本次 AI 基于：${src.label}（与主款/原图可能不同，请注意切换画板）`,
      };
    }
    default: {
      const src = describeArtboardById(project, effectiveActive);
      return { ...src, hint: `本次 AI 基于：${src.label}` };
    }
  }
}

export function aiPresetToActionId(
  preset: AiLoadingPresetId | null,
  options?: { isFlatFrontRegen?: boolean },
): AiActionId | null {
  if (!preset) return null;
  if (preset === "view-image") {
    return options?.isFlatFrontRegen ? "flat-front-regen" : "view-image";
  }
  if (preset === "annotate-process") return "annotate-process";
  if (preset === "region-annotate") return "region-annotate";
  if (preset === "size-dimension") return "size-dimension";
  if (preset === "fill-bom") return "fill-bom";
  if (preset === "fill-size") return "fill-size";
  if (preset === "enhance") return "enhance";
  if (preset === "explain") return "explain";
  if (preset === "draft") return "full-collect";
  return null;
}

/** 画布工具栏常驻说明 */
export function buildStudioAiSourceBanner(
  project: ProjectSlice,
  activeArtboardId?: string,
): string {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const active = describeArtboardById(project, activeArtboardId ?? primaryId);
  const setNote = isSetTarget(project.intake) ? " · 套装请分上装/下装标注" : "";

  if (activeArtboardId && activeArtboardId !== primaryId) {
    return `AI 识图：标工艺/填尺寸 → ${active.label} · 填物料/补全 → ${describeIntakeOriginal(project.intake)} · 侧栏生视角图 → 主款平铺${setNote}`;
  }

  return `AI 识图：标工艺/填尺寸/评语 → 主款平铺 · 填物料/补全 → ${describeIntakeOriginal(project.intake)} · 侧栏生视角图 → 主款平铺${setNote}`;
}

/** 同步解析 overlay 预览图（不做压缩） */
export function resolveAiImagePreviewUrl(
  project: ProjectSlice,
  action: AiActionId,
  activeArtboardId?: string,
): string | undefined {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);

  switch (action) {
    case "fill-bom":
    case "enhance":
    case "flat-front-regen":
      return project.intake.imageDataUrl;
    case "explain":
    case "full-collect":
    case "view-image": {
      const ab = primaryId
        ? project.canvas_data.artboards.find((a) => a.id === primaryId)
        : project.canvas_data.artboards[0];
      return ab?.imageDataUrl ?? project.intake.imageDataUrl;
    }
    default: {
      const id = activeArtboardId ?? primaryId;
      const ab = id
        ? project.canvas_data.artboards.find((a) => a.id === id)
        : undefined;
      return ab?.imageDataUrl ?? project.intake.imageDataUrl;
    }
  }
}

/** 各 AI 按钮 title 补充 */
export const AI_ACTION_BUTTON_TITLES: Record<
  Exclude<AiActionId, "region-annotate" | "size-dimension" | "flat-front-regen" | "view-image">,
  string
> = {
  "annotate-process": "画布区域标注 + 工艺 tab · 基于当前画板",
  "fill-bom": "生成物料清单 → 物料 tab · 基于原参考图",
  "fill-size": "尺码表 + 尺寸线 · 基于当前画板",
  enhance: "补全工艺/物料/尺寸空白项 · 物料基于原参考图",
  explain: "生成款式评语 · 基于主款平铺",
  "full-collect": "问卷 + 工艺/BOM/标注/尺寸全量 · 主款 + 原图",
};
