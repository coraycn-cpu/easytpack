import type { ViewImageKind } from "@/lib/studio/view-types";

/**
 * 用户常在「自定义」里写「生成正面平铺图」等，需映射到正式 kind，
 * 否则走 custom 模板 + Kontext 时容易只做轻度修图、仍保留模特。
 */
export function resolveViewKindFromCustomPrompt(
  customPrompt: string,
): ViewImageKind | null {
  const t = customPrompt.trim().toLowerCase();
  if (!t) return null;

  if (
    /线稿|线描|勾线|flat\s*sketch|line\s*art|technical\s*drawing/.test(t)
  ) {
    return "line_art";
  }
  if (/背面|后背|back\s*view|rear/.test(t)) {
    return "back";
  }
  if (/领口|领型|collar|neckline/.test(t)) {
    return "collar";
  }
  if (/袖口|袖型|cuff|sleeve\s*hem/.test(t)) {
    return "cuff";
  }
  if (
    /平铺|挂拍|flat\s*lay|flat\s*front|产品平铺|正面平铺|款式平铺|ghost\s*mannequin/.test(
      t,
    )
  ) {
    return "flat_front";
  }
  return null;
}
