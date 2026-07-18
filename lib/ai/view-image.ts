import { getModel } from "@/lib/ai/assist";
import {
  getImageProvidersConfig,
  synthesizeViewImageWithProviders,
  type SynthesizeViewImageResult,
} from "@/lib/ai/image-providers";
import {
  artboardNameForKind,
  buildRecraftPromptForKind,
  extractGarmentSpec,
} from "@/lib/ai/image-providers/recraft-prompt";
import {
  getViewPresetHint,
  FLAT_FRONT_SET_VIEW_HINT,
  type ViewImageKind,
} from "@/lib/studio/view-types";
import { resolveViewKindFromCustomPrompt } from "@/lib/studio/resolve-view-kind";
import { appendCorrectionToPrompt } from "@/lib/studio/view-image-constraints";
import { isSetTarget } from "@/lib/ai/garment-scope";
import type { GarmentScopeInput } from "@/lib/ai/assist";

export type { SynthesizeViewImageResult } from "@/lib/ai/image-providers";
export type { ViewImageKind } from "@/lib/studio/view-types";
export { VIEW_IMAGE_PRESETS } from "@/lib/studio/view-types";

function viewHintForKind(
  kind: ViewImageKind,
  customPrompt?: string,
  intake?: GarmentScopeInput,
): string {
  if (kind === "flat_front" && intake && isSetTarget(intake)) {
    return FLAT_FRONT_SET_VIEW_HINT;
  }
  return getViewPresetHint(kind, customPrompt);
}

export async function generateViewImagePrompt(input: {
  kind: ViewImageKind;
  customPrompt?: string;
  correctionPrompt?: string;
  category?: string;
  description?: string;
  sourceImageUrl?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  intake?: GarmentScopeInput;
}) {
  // 自定义里写「正面平铺/线稿」等 → 映射到正式 kind
  let kind = input.kind;
  if (kind === "custom" && input.customPrompt) {
    const mapped = resolveViewKindFromCustomPrompt(input.customPrompt);
    if (mapped) kind = mapped;
  }

  const viewDesc = viewHintForKind(kind, input.customPrompt, input.intake);

  if (input.sourceImageUrl) {
    const spec = await extractGarmentSpec({
      sourceImageUrl: input.sourceImageUrl,
      kind,
      category: input.category ?? input.intake?.detectedCategory,
      description: input.description ?? input.intake?.description,
      correctionPrompt: input.correctionPrompt,
    });

    const imagePrompt = buildRecraftPromptForKind({
      kind,
      spec,
      viewHint: viewDesc,
      correctionPrompt: input.correctionPrompt,
    });

    return {
      kind,
      imagePrompt,
      artboardName: artboardNameForKind(kind, spec),
      garmentSpecJson: JSON.stringify(spec),
    };
  }

  const imagePrompt = buildRecraftPromptForKind({
    kind,
    viewHint: [
      viewDesc,
      input.category ? `Category: ${input.category}` : "",
      input.description ? `Description: ${input.description}` : "",
    ]
      .filter(Boolean)
      .join(". "),
    correctionPrompt: input.correctionPrompt,
  });

  return {
    kind,
    imagePrompt,
    artboardName: artboardNameForKind(kind),
    garmentSpecJson: undefined as string | undefined,
  };
}

export async function synthesizeViewImage(
  prompt: string,
  options?: {
    sourceImageUrl?: string;
    correctionPrompt?: string;
    kind?: ViewImageKind;
    garmentSpecJson?: string;
  },
): Promise<SynthesizeViewImageResult> {
  // 已带 garmentSpec 时 prompt 已含修正词，勿再 append 造成重复
  const fullPrompt = options?.garmentSpecJson
    ? prompt
    : appendCorrectionToPrompt(prompt, options?.correctionPrompt);
  return synthesizeViewImageWithProviders({
    prompt: fullPrompt,
    sourceImageUrl: options?.sourceImageUrl,
    kind: options?.kind,
    correctionPrompt: options?.correctionPrompt,
    garmentSpecJson: options?.garmentSpecJson,
  });
}

export function getViewImageConfig() {
  const imageProviders = getImageProvidersConfig();
  return {
    ...imageProviders,
    textModel: getModel(),
  };
}
