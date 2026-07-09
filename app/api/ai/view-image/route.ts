import { NextRequest, NextResponse } from "next/server";
import {
  generateViewImagePrompt,
  getViewImageConfig,
  synthesizeViewImage,
  type ViewImageKind,
} from "@/lib/ai/view-image";

export async function GET() {
  return NextResponse.json(getViewImageConfig());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind = body.kind as ViewImageKind;
    if (!kind || !["back", "side", "collar_cuff", "custom"].includes(kind)) {
      return NextResponse.json({ error: "无效的视角类型" }, { status: 400 });
    }

    const { imagePrompt, artboardName } = await generateViewImagePrompt({
      kind,
      customPrompt: body.customPrompt,
      category: body.category,
      description: body.description,
      sourceImageUrl: body.sourceImageUrl,
    });

    const synthesis = await synthesizeViewImage(imagePrompt, {
      sourceImageUrl: body.sourceImageUrl,
    });

    return NextResponse.json({
      imageDataUrl: synthesis.imageDataUrl,
      artboardName,
      imagePrompt,
      needsClientPlaceholder: !synthesis.imageDataUrl,
      provider: synthesis.provider,
      model: synthesis.model,
      synthesisError: synthesis.error,
    });
  } catch (error) {
    console.error("[AI view-image]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "视角图生成失败" },
      { status: 500 },
    );
  }
}
