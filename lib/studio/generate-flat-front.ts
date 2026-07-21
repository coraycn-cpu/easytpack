import { resolveImageDataUrlForAi } from "@/lib/ai/image-for-request";
import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import {
  appendPhotoReferenceArtboard,
  shouldKeepPhotoReference,
} from "@/lib/studio/reference-artboard";
import {
  matchImageToSourceSize,
  getImageDimensions,
} from "@/lib/studio/view-image-client";
import type { TechPackProject } from "@/types/project";

export type FlatFrontGenerationResult = {
  project: TechPackProject;
  success: boolean;
  message: string;
  synthesisError?: string;
};

export type FlatFrontGenerationOptions = {
  /** 重新生成时传入修正词 */
  correctionPrompt?: string;
  /** 重新生成：保留已有标注；首次生成会清空主款标注 */
  regenerate?: boolean;
};

/**
 * 调用 view-image API，将平铺正面写入主款画板；模特/拼贴原图保留为参考画板。
 * 首次：参考 intake 原图；修正重生成：参考当前主款平铺图（用户正在看的那张），避免盲盒重抽。
 */
export async function generateFlatFrontForPrimary(
  project: TechPackProject,
  options?: FlatFrontGenerationOptions,
): Promise<FlatFrontGenerationResult> {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const primary = project.canvas_data.artboards.find((a) => a.id === primaryId);

  const intakeUrl = project.intake.imageDataUrl;
  const currentPrimaryUrl = primary?.imageDataUrl;
  const useCurrentAsSource =
    Boolean(options?.regenerate) && Boolean(currentPrimaryUrl);

  const sourceImageUrl = useCurrentAsSource
    ? (currentPrimaryUrl as string)
    : intakeUrl;

  if (!sourceImageUrl) {
    return {
      project,
      success: false,
      message: "缺少参考图，无法生成平铺正面",
    };
  }

  const imageForAi = await resolveImageDataUrlForAi(sourceImageUrl);
  if (!imageForAi) {
    return {
      project,
      success: false,
      message: "参考图过大，无法生成平铺正面",
    };
  }

  const { width: sourceWidth, height: sourceHeight } =
    await getImageDimensions(sourceImageUrl);

  const res = await fetch("/api/ai/view-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: project.id,
      kind: "flat_front",
      correctionPrompt: options?.correctionPrompt,
      category:
        project.intake.targetGarment?.category ??
        project.intake.detectedCategory,
      description:
        project.intake.targetGarment?.label ??
        project.intake.description,
      sourceImageUrl: imageForAi,
      sourceWidth,
      sourceHeight,
      intake: project.intake,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      project,
      success: false,
      message: data.error ?? "平铺正面生成失败",
    };
  }

  let imageDataUrl = data.imageDataUrl as string | null;
  let synthesisError = data.synthesisError as string | undefined;

  if (!imageDataUrl) {
    return {
      project,
      success: false,
      message: `平铺正面生成失败：${synthesisError ?? "API 未返回图片"}。主款图未改动，请检查密钥后重试。`,
      synthesisError: synthesisError ?? "API 未返回图片",
    };
  }

  imageDataUrl = await matchImageToSourceSize(imageDataUrl, sourceImageUrl);

  const referenceImageUrl =
    shouldKeepPhotoReference(project.intake.photoType) &&
    !useCurrentAsSource &&
    primary?.imageDataUrl
      ? primary.imageDataUrl
      : intakeUrl ?? sourceImageUrl;

  const viewMeta = {
    kind: "flat_front" as const,
    lastImagePrompt: data.imagePrompt as string | undefined,
    correctionPrompt: options?.correctionPrompt,
    generationStatus: "ok" as const,
  };

  let artboards = project.canvas_data.artboards.map((ab) => {
    if (ab.id !== primaryId) return ab;
    return {
      ...ab,
      name: "正面",
      imageDataUrl,
      annotations: options?.regenerate ? ab.annotations : [],
      imageOffset: { x: 0, y: 0 },
      viewImageMeta: viewMeta,
    };
  });

  if (
    shouldKeepPhotoReference(project.intake.photoType) &&
    !useCurrentAsSource &&
    intakeUrl
  ) {
    artboards = await appendPhotoReferenceArtboard(
      artboards,
      referenceImageUrl,
      project.intake.photoType,
    );
  }

  const updated: TechPackProject = {
    ...project,
    canvas_data: {
      ...project.canvas_data,
      artboards,
      activeArtboardId: primaryId ?? project.canvas_data.activeArtboardId,
    },
    intake: {
      ...project.intake,
      flatFrontGenerated: true,
    },
  };

  const ok = true;
  const keptRef = shouldKeepPhotoReference(project.intake.photoType);
  return {
    project: updated,
    success: ok,
    message: useCurrentAsSource
      ? `已按当前平铺图修正生成（${data.provider ?? "AI"}）`
      : keptRef
        ? `已生成平铺正面主款图，${project.intake.photoType === "model" ? "模特" : "拼贴"}原图已保留为参考画板`
        : `已生成平铺正面主款图（${data.provider ?? "AI"}）`,
    synthesisError,
  };
}
