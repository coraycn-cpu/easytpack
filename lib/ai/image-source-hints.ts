import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
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

/** 与真实 API 入参对齐的短生命周期上下文（由 studio 在请求前写入） */
export type AiImageContext = {
  action: AiActionId;
  /** 有则预览/文案跟该画板 */
  sourceArtboardId?: string;
  /** 强制使用 intake 原图（平铺首次/重生成、BOM 等） */
  preferIntake?: boolean;
  /** 如「背面」「线稿」「平铺正面」 */
  taskLabel?: string;
  /** customPrompt / correctionPrompt 摘要 */
  userNote?: string;
};

type ProjectSlice = Pick<TechPackProject, "intake" | "canvas_data">;

export type AiImageSourceResult = {
  kind: AiImageSourceKind;
  label: string;
  hint: string;
  artboardId?: string;
  previewUrl?: string;
  taskLabel?: string;
  userNote?: string;
};

type SourceResolveOptions = {
  activeArtboardId?: string;
  /** 覆盖默认策略：指定画板 / intake */
  context?: Pick<
    AiImageContext,
    "sourceArtboardId" | "preferIntake" | "taskLabel" | "userNote"
  > | null;
};

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

function appendTaskAndNote(
  hint: string,
  taskLabel?: string,
  userNote?: string,
): string {
  let next = hint;
  if (taskLabel?.trim()) {
    next = `${next} · 任务：${taskLabel.trim()}`;
  }
  const note = userNote?.trim();
  if (note) {
    const short = note.length > 40 ? `${note.slice(0, 40)}…` : note;
    next = `${next} · 修正/自定义：${short}`;
  }
  return next;
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

function previewUrlForArtboard(
  project: ProjectSlice,
  artboardId?: string,
): string | undefined {
  if (!artboardId) return project.intake.imageDataUrl;
  const ab = project.canvas_data.artboards.find((a) => a.id === artboardId);
  return ab?.imageDataUrl ?? project.intake.imageDataUrl;
}

/** collect / 一键标注 overlay 固定说明（与 runFullTechPackAnnotation 一致） */
export const FULL_COLLECT_SOURCE_HINT =
  "本次 AI 基于：工艺/尺寸用主款画板；物料用原参考图";

/**
 * 各 AI 功能使用的图片来源。
 * 若传入 context.sourceArtboardId / preferIntake，则与真实 API 入参对齐，覆盖默认策略。
 */
export function getAiActionImageSource(
  action: AiActionId,
  project: ProjectSlice,
  activeArtboardId?: string,
  context?: SourceResolveOptions["context"],
): AiImageSourceResult {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const effectiveActive = activeArtboardId ?? primaryId;
  const taskLabel = context?.taskLabel;
  const userNote = context?.userNote;

  if (context?.preferIntake) {
    const label = describeIntakeOriginal(project.intake);
    const isFlat =
      action === "flat-front-regen" ||
      Boolean(taskLabel && /平铺/.test(taskLabel));
    return {
      kind: "intake_original",
      label,
      hint: appendTaskAndNote(
        isFlat
          ? `本次 AI 基于：${label}（生成/重生成主款平铺）`
          : `本次 AI 基于：${label}（看面料/细节，非当前画板）`,
        taskLabel,
        userNote,
      ),
      previewUrl: project.intake.imageDataUrl,
      taskLabel,
      userNote,
    };
  }

  if (context?.sourceArtboardId) {
    const src = describeArtboardById(project, context.sourceArtboardId);
    const primaryIdNow = getPrimaryArtboardId(project.canvas_data.artboards);
    const sameAsPrimary = context.sourceArtboardId === primaryIdNow;
    let baseHint: string;
    if (action === "view-image") {
      baseHint = sameAsPrimary
        ? `本次 AI 基于：${src.label}`
        : `本次 AI 基于：${src.label}（非主款，生图参考当前选中彩图）`;
    } else if (
      action === "annotate-process" ||
      action === "region-annotate" ||
      action === "size-dimension" ||
      action === "fill-size"
    ) {
      baseHint = sameAsPrimary
        ? `本次 AI 基于：${src.label}`
        : `本次 AI 基于：${src.label}（与主款/原图可能不同，请注意切换画板）`;
    } else {
      baseHint = `本次 AI 基于：${src.label}`;
    }
    return {
      ...src,
      hint: appendTaskAndNote(baseHint, taskLabel, userNote),
      previewUrl: previewUrlForArtboard(project, context.sourceArtboardId),
      taskLabel,
      userNote,
    };
  }

  switch (action) {
    case "fill-bom":
    case "enhance": {
      const label = describeIntakeOriginal(project.intake);
      return {
        kind: "intake_original",
        label,
        hint: appendTaskAndNote(
          `本次 AI 基于：${label}（看面料/细节，非当前画板）`,
          taskLabel,
          userNote,
        ),
        previewUrl: project.intake.imageDataUrl,
        taskLabel,
        userNote,
      };
    }
    case "explain": {
      const src = describeArtboardById(project, primaryId);
      return {
        ...src,
        hint: appendTaskAndNote(`本次 AI 基于：${src.label}`, taskLabel, userNote),
        previewUrl: previewUrlForArtboard(project, primaryId),
        taskLabel,
        userNote,
      };
    }
    case "full-collect": {
      const src = describeArtboardById(project, primaryId);
      return {
        ...src,
        // 与 runFullTechPackAnnotation / 分项 AI 一致：工艺·尺寸·评语用主款；物料用原图
        hint: appendTaskAndNote(FULL_COLLECT_SOURCE_HINT, taskLabel, userNote),
        previewUrl: previewUrlForArtboard(project, primaryId),
        taskLabel,
        userNote,
      };
    }
    case "view-image": {
      // 无 context 时退回主款（兼容旧调用）；有生图时应始终传入 sourceArtboardId
      const src = describeArtboardById(project, primaryId);
      return {
        ...src,
        hint: appendTaskAndNote(
          `本次 AI 基于：${src.label}`,
          taskLabel,
          userNote,
        ),
        previewUrl: previewUrlForArtboard(project, primaryId),
        taskLabel,
        userNote,
      };
    }
    case "flat-front-regen": {
      // 有指定画板（修正当前平铺）时跟画板；否则首次生成用 intake
      if (context?.sourceArtboardId && !context.preferIntake) {
        const src = describeArtboardById(project, context.sourceArtboardId);
        return {
          ...src,
          hint: appendTaskAndNote(
            `本次 AI 基于：${src.label}（在当前平铺上修正）`,
            taskLabel,
            userNote,
          ),
          previewUrl: previewUrlForArtboard(project, context.sourceArtboardId),
          taskLabel,
          userNote,
        };
      }
      const label = describeIntakeOriginal(project.intake);
      return {
        kind: "intake_original",
        label,
        hint: appendTaskAndNote(
          `本次 AI 基于：${label}（生成/重生成主款平铺）`,
          taskLabel,
          userNote,
        ),
        previewUrl: project.intake.imageDataUrl,
        taskLabel,
        userNote,
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
        hint: appendTaskAndNote(
          sameAsPrimary
            ? `本次 AI 基于：${src.label}`
            : `本次 AI 基于：${src.label}（与主款/原图可能不同，请注意切换画板）`,
          taskLabel,
          userNote,
        ),
        previewUrl: previewUrlForArtboard(project, effectiveActive),
        taskLabel,
        userNote,
      };
    }
    default: {
      const src = describeArtboardById(project, effectiveActive);
      return {
        ...src,
        hint: appendTaskAndNote(`本次 AI 基于：${src.label}`, taskLabel, userNote),
        previewUrl: previewUrlForArtboard(project, effectiveActive),
        taskLabel,
        userNote,
      };
    }
  }
}

export function aiPresetToActionId(
  preset: AiLoadingPresetId | null,
  options?: { isFlatFrontRegen?: boolean; preferIntake?: boolean },
): AiActionId | null {
  if (!preset) return null;
  if (preset === "view-image") {
    return options?.isFlatFrontRegen || options?.preferIntake
      ? "flat-front-regen"
      : "view-image";
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

/** 同步解析 overlay 预览图（不做压缩）；优先使用 context */
export function resolveAiImagePreviewUrl(
  project: ProjectSlice,
  action: AiActionId,
  activeArtboardId?: string,
  context?: SourceResolveOptions["context"],
): string | undefined {
  if (context?.preferIntake) {
    return project.intake.imageDataUrl;
  }
  if (context?.sourceArtboardId) {
    return previewUrlForArtboard(project, context.sourceArtboardId);
  }

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

/** 从 AiImageContext 解析完整来源结果（overlay 推荐入口） */
export function resolveAiImageSourceFromContext(
  project: ProjectSlice,
  context: AiImageContext | null | undefined,
  activeArtboardId?: string,
): AiImageSourceResult | null {
  if (!context) return null;
  return getAiActionImageSource(
    context.action,
    project,
    activeArtboardId,
    context,
  );
}

/** 各 AI 按钮 title 补充 */
export const AI_ACTION_BUTTON_TITLES: Record<
  Exclude<AiActionId, "region-annotate" | "size-dimension" | "flat-front-regen" | "view-image">,
  string
> = {
  "annotate-process": "画布区域标注 + 工艺 tab · 基于当前画板",
  "fill-bom": "生成物料清单 → 物料 tab · 基于原参考图",
  "fill-size": "尺码表 + 尺寸线 · 基于当前画板",
  enhance: "一键补全：只填空白项，不覆盖已有内容 · 物料基于原参考图",
  explain: "生成款式评语 · 基于主款平铺",
  "full-collect": "AI 一键标注：问卷 + 工艺/BOM/标注/尺寸初稿（可覆盖空包）",
};

/** @deprecated 使用文件顶部 FULL_COLLECT_SOURCE_HINT */
export const FULL_COLLECT_SOURCE_HINT_LEGACY = FULL_COLLECT_SOURCE_HINT;