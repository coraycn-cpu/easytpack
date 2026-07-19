import type { Artboard } from "@/types/project";
import type { ViewImageKind } from "@/lib/studio/view-types";

/** 画板显示名：与生成目标类型一致的短名（不用款名/AI 长文案） */
export const VIEW_KIND_ARTBOARD_NAME: Record<ViewImageKind, string> = {
  flat_front: "正面",
  back: "背面",
  collar: "领口",
  cuff: "袖口",
  custom: "自定义视角",
  line_art: "线稿",
};

const KNOWN_VIEW_LABELS = [
  "背面",
  "正面",
  "领口",
  "袖口",
  "自定义视角",
  "平铺正面",
  "贴图",
] as const;

/** 从现有画板名中抽出视角短名（兼容「款名 背面」等旧名） */
export function shortViewBaseName(
  source: Pick<Artboard, "name" | "viewImageMeta">,
): string {
  const kind = source.viewImageMeta?.kind;
  if (kind && kind !== "line_art") {
    return VIEW_KIND_ARTBOARD_NAME[kind];
  }

  const cleaned = (source.name ?? "").replace(/-?线稿$/u, "").trim();
  if (!cleaned) return "正面";

  for (const label of KNOWN_VIEW_LABELS) {
    if (cleaned === label) {
      return label === "平铺正面" ? "正面" : label;
    }
    if (
      cleaned.endsWith(` ${label}`) ||
      cleaned.endsWith(`-${label}`) ||
      cleaned.endsWith(label)
    ) {
      if (label === "平铺正面") return "正面";
      if (label === "贴图") {
        const m = /贴图(?:\s*\d+)?$/u.exec(cleaned);
        return m ? m[0] : "贴图";
      }
      return label;
    }
  }

  if (/^贴图(\s*\d+)?$/u.test(cleaned)) return cleaned;
  if (cleaned.length <= 6) return cleaned;
  return "正面";
}

export function canonicalArtboardNameForKind(kind: ViewImageKind): string {
  return VIEW_KIND_ARTBOARD_NAME[kind];
}

export function lineArtArtboardNameFromSource(
  source: Pick<Artboard, "name" | "viewImageMeta">,
): string {
  return `${shortViewBaseName(source)}-线稿`;
}

/**
 * 画板视角短标识：正面 / 背面 / 领口 / 正面-线稿 等
 *（用于 AI草稿角标，避免只显示「AI草稿」丢视角信息）
 */
export function artboardViewBadgeLabel(
  source: Pick<Artboard, "name" | "viewImageMeta">,
): string {
  const kind = source.viewImageMeta?.kind;
  if (kind === "line_art") {
    const name = source.name?.trim() ?? "";
    if (name.includes("线稿")) return name;
    return lineArtArtboardNameFromSource(source);
  }
  if (kind) return VIEW_KIND_ARTBOARD_NAME[kind];
  return shortViewBaseName(source);
}

/** 例：AI草稿-正面、AI草稿-背面、AI草稿-正面-线稿 */
export function formatAiDraftBadge(
  source: Pick<Artboard, "name" | "viewImageMeta">,
  prefix = "AI草稿",
): string {
  return `${prefix}-${artboardViewBadgeLabel(source)}`;
}
