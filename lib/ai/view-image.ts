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
import {
  buildTargetIsolationPrompt,
  isSetTarget,
} from "@/lib/ai/garment-scope";
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

function targetSpecHints(intake?: GarmentScopeInput) {
  const target = intake?.targetGarment;
  if (!target) {
    return {
      category: intake?.detectedCategory,
      description: intake?.description,
      targetLabel: undefined as string | undefined,
      targetCategory: undefined as string | undefined,
      excludeLabels: undefined as string[] | undefined,
      isSet: false,
    };
  }
  const excludeLabels = (intake?.visibleGarments ?? [])
    .filter((g) => g.id !== target.id && g.kind !== "set")
    .map((g) => g.label);
  return {
    category: target.category || intake?.detectedCategory,
    description: target.label || intake?.description,
    targetLabel: target.label,
    targetCategory: target.category,
    excludeLabels,
    isSet: isSetTarget(intake!),
  };
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
  // 自定义里写「正面平铺」等 → 映射到正式 kind（线稿不再从此入口生成）
  let kind = input.kind;
  if (kind === "custom" && input.customPrompt) {
    const mapped = resolveViewKindFromCustomPrompt(input.customPrompt);
    if (mapped && "kind" in mapped) kind = mapped.kind;
  }

  const viewDesc = viewHintForKind(kind, input.customPrompt, input.intake);
  const hints = targetSpecHints(input.intake);
  const scopeNote = input.intake
    ? buildTargetIsolationPrompt(input.intake)
    : "";
  const category = hints.category ?? input.category;
  const description = hints.description ?? input.description;

  if (input.sourceImageUrl) {
    // 线稿：不抽 GarmentSpec 主导构图，强制「描摹源图」提示词
    if (kind === "line_art") {
      const imagePrompt = buildRecraftPromptForKind({
        kind: "line_art",
        viewHint: viewDesc,
        correctionPrompt: input.correctionPrompt,
        scopeNote,
      });
      return {
        kind,
        imagePrompt,
        artboardName: artboardNameForKind("line_art"),
      };
    }

    const spec = await extractGarmentSpec({
      sourceImageUrl: input.sourceImageUrl,
      kind,
      category,
      description,
      correctionPrompt: input.correctionPrompt,
      targetLabel: hints.targetLabel,
      targetCategory: hints.targetCategory,
      excludeLabels: hints.excludeLabels,
      isSet: hints.isSet,
    });

    const imagePrompt = buildRecraftPromptForKind({
      kind,
      spec,
      viewHint: viewDesc,
      correctionPrompt: input.correctionPrompt,
      scopeNote,
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
      category ? `Category: ${category}` : "",
      description ? `Description: ${description}` : "",
    ]
      .filter(Boolean)
      .join(". "),
    correctionPrompt: input.correctionPrompt,
    scopeNote,
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
