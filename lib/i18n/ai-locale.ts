import type { Locale } from "@/lib/i18n/locale";

/**
 * Inject into AI system / user prompts so generated tech-pack text
 * follows UI language with apparel industry terminology.
 */
export function aiOutputLanguageBlock(locale: Locale): string {
  if (locale === "en") {
    return `
OUTPUT LANGUAGE (mandatory):
- Write ALL user-facing text in professional fashion / tech-pack English.
- Use industry terms: seam allowance, stitch type, CB length, body length, BOM, POM, facing, interlining, placket, hem, waistband, side seam, armhole, etc.
- Keep IDs, enums (fabric/trim/…), coordinates, size codes (S/M/L), and numbers unchanged.
- Prefer concise wording suitable for factory tech packs (avoid slang).
- Do NOT use Chinese characters in generated content fields.
`.trim();
  }
  return `
输出语言（必须遵守）：
- 所有面向用户的文字使用简体中文。
- 工艺/物料/尺寸用语符合服装版房与 Tech Pack 习惯。
- ID、枚举、坐标、尺码代号（S/M/L）与数字保持不变。
`.trim();
}

export function aiChatLanguageBlock(locale: Locale): string {
  if (locale === "en") {
    return `
REPLY LANGUAGE: Answer the user in clear professional English (fashion tech-pack context). Field edits must also be English.
`.trim();
  }
  return `
回复语言：用简明中文回答；改工艺包字段时也用中文。
`.trim();
}

/** Style review section headers by locale */
export function styleReviewSectionHeaders(locale: Locale): {
  features: string;
  fabric: string;
  construction: string;
  concerns: string;
} {
  if (locale === "en") {
    return {
      features: "STYLE FEATURES",
      fabric: "FABRIC NOTES",
      construction: "CONSTRUCTION",
      concerns: "KEY CONCERNS",
    };
  }
  return {
    features: "款式特点",
    fabric: "面料建议",
    construction: "工艺建议",
    concerns: "注意事项",
  };
}
