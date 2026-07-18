import type { ViewImageKind } from "@/lib/studio/view-types";

export type CustomPromptResolveResult =
  | { kind: ViewImageKind }
  | { blocked: "line_art" };

/**
 * 用户常在「自定义」里写「生成正面平铺图」等，需映射到正式 kind。
 * 「线稿」不再映射为全局生成，改为引导使用彩图下方按钮。
 */
export function resolveViewKindFromCustomPrompt(
  customPrompt: string,
): CustomPromptResolveResult | null {
  const t = customPrompt.trim().toLowerCase();
  if (!t) return null;

  if (
    /线稿|线描|勾线|flat\s*sketch|line\s*art|technical\s*drawing/.test(t)
  ) {
    return { blocked: "line_art" };
  }
  if (/背面|后背|back\s*view|rear/.test(t)) {
    return { kind: "back" };
  }
  if (/领口|领型|collar|neckline/.test(t)) {
    return { kind: "collar" };
  }
  if (/袖口|袖型|cuff|sleeve\s*hem/.test(t)) {
    return { kind: "cuff" };
  }
  if (
    /平铺|挂拍|flat\s*lay|flat\s*front|产品平铺|正面平铺|款式平铺|ghost\s*mannequin/.test(
      t,
    )
  ) {
    return { kind: "flat_front" };
  }
  return null;
}
