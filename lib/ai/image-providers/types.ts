import type { ViewImageKind } from "@/lib/studio/view-types";

export type ImageProviderId = "gateway" | "siliconflow" | "dashscope";

export type SynthesizeViewImageResult = {
  imageDataUrl: string | null;
  provider?: ImageProviderId;
  model?: string;
  error?: string;
};

export type SynthesizeViewImageOptions = {
  prompt: string;
  sourceImageUrl?: string;
  /** 视角类型：决定 Recraft prompt 模板（线稿 ≠ 产品平铺） */
  kind?: ViewImageKind;
  correctionPrompt?: string;
  /** 已提取的服装规格（可选，避免 Gateway 内再看一次图） */
  garmentSpecJson?: string;
};
