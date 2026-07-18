import { synthesizeViaDashscope, isDashscopeImageConfigured } from "./dashscope";
import {
  getGatewayImageModel,
  getGatewayReferenceImageModel,
  isGatewayImageConfigured,
  isGatewayMultimodalImage,
  synthesizeViaGateway,
} from "./gateway";
import {
  getSiliconflowImageModel,
  isSiliconflowImageConfigured,
  synthesizeViaSiliconflow,
} from "./siliconflow";
import type { ImageProviderId, SynthesizeViewImageOptions, SynthesizeViewImageResult } from "./types";

export type { ImageProviderId, SynthesizeViewImageResult } from "./types";

type ImageProviderMode = ImageProviderId | "auto";

const PROVIDER_SYNTHESIZERS: Record<
  ImageProviderId,
  (options: SynthesizeViewImageOptions) => Promise<SynthesizeViewImageResult>
> = {
  siliconflow: synthesizeViaSiliconflow,
  gateway: synthesizeViaGateway,
  dashscope: synthesizeViaDashscope,
};

function resolveImageProviderMode(): ImageProviderMode {
  const raw = process.env.AI_IMAGE_PROVIDER?.trim();
  if (raw === "gateway" || raw === "siliconflow" || raw === "dashscope") return raw;
  return "auto";
}

function parseFallbackOrder(hasReference?: boolean): ImageProviderId[] {
  const raw = (
    hasReference
      ? process.env.AI_IMAGE_FALLBACK_WITH_REF?.trim() ||
        process.env.AI_IMAGE_FALLBACK?.trim()
      : process.env.AI_IMAGE_FALLBACK?.trim()
  );
  if (raw) {
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(
        (s): s is ImageProviderId =>
          s === "gateway" || s === "siliconflow" || s === "dashscope",
      );
    if (ids.length > 0) return ids;
  }
  // Gateway Recraft 优先；失败再硅基流动
  return ["gateway", "siliconflow", "dashscope"];
}

function isProviderConfigured(id: ImageProviderId): boolean {
  switch (id) {
    case "siliconflow":
      return isSiliconflowImageConfigured();
    case "gateway":
      return isGatewayImageConfigured();
    case "dashscope":
      return isDashscopeImageConfigured();
  }
}

/** 按配置或 auto 顺序尝试生图，返回首个成功结果或最后一次失败详情 */
export async function synthesizeViewImageWithProviders(
  options: SynthesizeViewImageOptions,
): Promise<SynthesizeViewImageResult> {
  const mode = resolveImageProviderMode();
  const hasReference = Boolean(options.sourceImageUrl);
  const order: ImageProviderId[] =
    mode === "auto" ? parseFallbackOrder(hasReference) : [mode];

  let lastResult: SynthesizeViewImageResult = {
    imageDataUrl: null,
    error: "未配置任何生图 Provider",
  };

  for (const providerId of order) {
    if (!isProviderConfigured(providerId)) continue;

    const result = await PROVIDER_SYNTHESIZERS[providerId](options);
    if (result.imageDataUrl) return result;
    lastResult = result;
  }

  if (!lastResult.error) {
    lastResult.error =
      "所有已配置的生图 Provider 均未成功出图，请检查 AI_GATEWAY_API_KEY 或 SILICONFLOW_API_KEY";
  }

  return lastResult;
}

export function getImageProvidersConfig() {
  const mode = resolveImageProviderMode();
  return {
    mode,
    fallbackOrder: parseFallbackOrder(false),
    fallbackOrderWithRef: parseFallbackOrder(true),
    providers: {
      siliconflow: {
        configured: isSiliconflowImageConfigured(),
        model: getSiliconflowImageModel(),
      },
      gateway: {
        configured: isGatewayImageConfigured(),
        model: getGatewayImageModel(),
        referenceModel: getGatewayReferenceImageModel(),
        multimodalImage: isGatewayMultimodalImage(),
      },
      dashscope: {
        configured: isDashscopeImageConfigured(),
        model: "wanx-v1",
      },
    },
  };
}
