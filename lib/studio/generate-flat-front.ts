import { resolveImageDataUrlForAi } from "@/lib/ai/image-for-request";
import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
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

/** 调用 view-image API，将平铺正面写入主款画板 */
export async function generateFlatFrontForPrimary(
  project: TechPackProject,
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
  const artboards = project.canvas_data.artboards.map((ab) => {
    if (ab.id !== primaryId) return ab;
    return {
      ...ab,
      name: "正面",
      imageDataUrl,
      annotations: [],
      imageOffset: { x: 0, y: 0 },
    };
  });

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
  return {
    project: updated,
    success: ok,
    message: ok
      ? `已生成平铺正面主款图（${data.provider ?? "AI"}）`
      : `平铺正面生成失败，已用占位图：${synthesisError ?? "未知错误"}`,
    synthesisError,
  };
}
