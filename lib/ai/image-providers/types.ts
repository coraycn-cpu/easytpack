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
};
