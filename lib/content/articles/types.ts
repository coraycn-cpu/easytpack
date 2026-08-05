import type { Locale } from "@/lib/i18n/locale";
import { normalizeLocale } from "@/lib/i18n/locale";
import { BRAND_SHORT_NAME } from "@/lib/brand";

/** 专题文章（代码内写死，暂不接 CMS）；EN / ZH 成对维护 */

export const ARTICLES_PATH = "/articles";

export type ArticleFaq = { question: string; answer: string };

export type ArticleSection = {
  heading: string;
  /** 段落；若为 bullet 列表则用 bullets */
  paragraphs?: string[];
  bullets?: string[];
};

export type ArticleLocaleCopy = {
  title: string;
  description: string;
  /** GEO：首段可引用定义 */
  definition: string;
  audience: string;
  sections: ArticleSection[];
  steps?: Array<{ title: string; body: string }>;
  faq: ArticleFaq[];
  ctaLabel: string;
};

export type ArticleRecord = {
  slug: string;
  /** ISO date */
  publishedAt: string;
  updatedAt: string;
  series: "fundamentals" | "howto" | "roles" | "compare";
  relatedSlugs: string[];
  en: ArticleLocaleCopy;
  zh: ArticleLocaleCopy;
};

export type ArticlesHubCopy = {
  pageTitle: string;
  pageDescription: string;
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  seriesFundamentals: string;
  seriesHowto: string;
  seriesRoles: string;
  seriesCompare: string;
  navAria: string;
  navHome: string;
  navGuide: string;
  navRegister: string;
  readMore: string;
  updated: string;
  related: string;
  backToIndex: string;
  faqHeading: string;
  audienceLabel: string;
  stepsHeading: string;
  ctaHint: string;
};

export function getArticlesHubCopy(locale?: Locale | string | null): ArticlesHubCopy {
  const en = normalizeLocale(locale) === "en";
  if (en) {
    return {
      pageTitle: `${BRAND_SHORT_NAME} Articles — Tech Pack Guides`,
      pageDescription: `Practical apparel tech-pack guides from ${BRAND_SHORT_NAME}: definitions, how-tos, roles, and tool comparisons for factories and merchandisers.`,
      eyebrow: "Articles · Tech pack knowledge",
      heroTitle: "Apparel tech pack guides",
      heroLead:
        "Clear definitions and how-tos for tech packs (工艺包), BOM, POM, and annotation — written for search and AI assistants, then linked back to the studio.",
      seriesFundamentals: "Fundamentals",
      seriesHowto: "How-to",
      seriesRoles: "By role",
      seriesCompare: "Tools & comparisons",
      navAria: "Page navigation",
      navHome: "Home",
      navGuide: "Product FAQ",
      navRegister: "Register free",
      readMore: "Read",
      updated: "Updated",
      related: "Related",
      backToIndex: "← All articles",
      faqHeading: "FAQ",
      audienceLabel: "Who this is for",
      stepsHeading: "Steps",
      ctaHint: "Try it in the studio",
    };
  }
  return {
    pageTitle: `${BRAND_SHORT_NAME} 专题文章 — 工艺包知识`,
    pageDescription: `${BRAND_SHORT_NAME} 服装工艺包（Tech Pack）专题：定义、上手、角色场景与工具对比，面向版师、跟单与外贸沟通。`,
    eyebrow: "专题文章 · 工艺包知识",
    heroTitle: "服装工艺包专题",
    heroLead:
      "用可引用的定义与步骤讲清工艺包、BOM、POM 与标注——方便搜索与 AI 引用，并链回工作室动手做。",
    seriesFundamentals: "基础认知",
    seriesHowto: "怎么做",
    seriesRoles: "按角色",
    seriesCompare: "工具与对比",
    navAria: "页面导航",
    navHome: "回首页",
    navGuide: "功能介绍 / FAQ",
    navRegister: "免费注册",
    readMore: "阅读",
    updated: "更新",
    related: "相关文章",
    backToIndex: "← 全部文章",
    faqHeading: "常见问题",
    audienceLabel: "适合谁读",
    stepsHeading: "步骤",
    ctaHint: "去工作室试一试",
  };
}

export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`;
}

export function getArticleCopy(
  article: ArticleRecord,
  locale?: Locale | string | null,
): ArticleLocaleCopy {
  return normalizeLocale(locale) === "en" ? article.en : article.zh;
}

export function seriesLabel(
  series: ArticleRecord["series"],
  locale?: Locale | string | null,
): string {
  const hub = getArticlesHubCopy(locale);
  switch (series) {
    case "howto":
      return hub.seriesHowto;
    case "roles":
      return hub.seriesRoles;
    case "compare":
      return hub.seriesCompare;
    case "fundamentals":
    default:
      return hub.seriesFundamentals;
  }
}
