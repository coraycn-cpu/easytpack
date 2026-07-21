import { NextRequest, NextResponse } from "next/server";
import {
  generateViewImagePrompt,
  getViewImageConfig,
  synthesizeViewImage,
} from "@/lib/ai/view-image";
import { meterAiCallServer } from "@/lib/ai/metering";
import { isViewImageKind } from "@/lib/studio/view-types";

export async function GET() {
  return NextResponse.json(getViewImageConfig());
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let projectId: string | undefined;
  try {
    const body = await req.json();
    projectId =
      typeof body.projectId === "string" ? body.projectId : undefined;
    const kind = body.kind as string;
    if (!kind || !isViewImageKind(kind)) {
      return NextResponse.json({ error: "无效的视角类型" }, { status: 400 });
    }

    const { imagePrompt, artboardName, garmentSpecJson, kind: resolvedKind } =
      await generateViewImagePrompt({
        kind,
        customPrompt: body.customPrompt,
        correctionPrompt: body.correctionPrompt,
        category: body.category,
        description: body.description,
        sourceImageUrl: body.sourceImageUrl,
        sourceWidth: body.sourceWidth,
        sourceHeight: body.sourceHeight,
        intake: body.intake,
      });

    const synthesis = await synthesizeViewImage(imagePrompt, {
      sourceImageUrl: body.sourceImageUrl,
      correctionPrompt: body.correctionPrompt,
      kind: resolvedKind ?? kind,
      garmentSpecJson,
    });

    const ok = Boolean(synthesis.imageDataUrl);
    meterAiCallServer({
      action: "view-image",
      projectId,
      ok,
      provider: synthesis.provider,
      model: synthesis.model,
      error: ok ? undefined : synthesis.error,
    });

    const res = NextResponse.json({
      imageDataUrl: synthesis.imageDataUrl,
      artboardName,
      imagePrompt,
      kind: resolvedKind ?? kind,
      needsClientPlaceholder: !synthesis.imageDataUrl,
      provider: synthesis.provider,
      model: synthesis.model,
      synthesisError: synthesis.error,
    });
    res.headers.set("x-ai-action", "view-image");
    res.headers.set("x-ai-ms", String(Date.now() - started));
    return res;
  } catch (error) {
    console.error("[AI view-image]", error);
    meterAiCallServer({
      action: "view-image",
      projectId,
      ok: false,
      error: error instanceof Error ? error.message : "视角图生成失败",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "视角图生成失败" },
      { status: 500 },
    );
  }
}
