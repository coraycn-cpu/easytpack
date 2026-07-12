import { resolveImageDataUrlForAi } from "@/lib/ai/image-for-request";
import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import {
  appendPhotoReferenceArtboard,
  shouldKeepPhotoReference,
} from "@/lib/studio/reference-artboard";
import {
  createViewPlaceholderImage,
  getImageDimensions,
  matchImageToSourceSize,
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

/** 调用 view-image API，将平铺正面写入主款画板；模特/拼贴原图保留为参考画板 */
export async function generateFlatFrontForPrimary(
  project: TechPackProject,
  options?: FlatFrontGenerationOptions,
): Promise<FlatFrontGenerationResult> {
  const sourceImageUrl = project.intake.imageDataUrl;
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
      kind: "flat_front",
      correctionPrompt: options?.correctionPrompt,
      category: project.intake.detectedCategory,
      description: project.intake.description,
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
    imageDataUrl = await createViewPlaceholderImage(
      sourceImageUrl,
      data.artboardName ?? "平铺正面",
    );
    synthesisError = synthesisError ?? "生图 API 未返回图片";
  } else {
    imageDataUrl = await matchImageToSourceSize(imageDataUrl, sourceImageUrl);
  }

  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const primary = project.canvas_data.artboards.find((a) => a.id === primaryId);
  const referenceImageUrl =
    shouldKeepPhotoReference(project.intake.photoType) && primary?.imageDataUrl
      ? primary.imageDataUrl
      : sourceImageUrl;

  const viewMeta = {
    kind: "flat_front" as const,
    lastImagePrompt: data.imagePrompt as string | undefined,
    correctionPrompt: options?.correctionPrompt,
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

  if (shouldKeepPhotoReference(project.intake.photoType)) {
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

  const ok = Boolean(data.imageDataUrl);
  const keptRef = shouldKeepPhotoReference(project.intake.photoType);
  return {
    project: updated,
    success: ok,
    message: ok
      ? keptRef
        ? `已生成平铺正面主款图，${project.intake.photoType === "model" ? "模特" : "拼贴"}原图已保留为参考画板`
        : `已生成平铺正面主款图（${data.provider ?? "AI"}）`
      : `平铺正面生成失败，已用占位图：${synthesisError ?? "未知错误"}`,
    synthesisError,
  };
}
