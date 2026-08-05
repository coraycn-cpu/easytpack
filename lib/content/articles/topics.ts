import type { Locale } from "@/lib/i18n/locale";
import { normalizeLocale } from "@/lib/i18n/locale";

/**
 * 专题入口：把早期「总论」与后续长尾/品类文串成可点击入口，
 * 避免新文只沉在超长「怎么做」列表里找不到。
 */
export type ArticleTopic = {
  id: string;
  /** 入口封面文优先链到的代表篇 */
  hubSlug: string;
  slugs: string[];
  en: { title: string; blurb: string };
  zh: { title: string; blurb: string };
};

export const ARTICLE_TOPICS: ArticleTopic[] = [
  {
    id: "start-here",
    hubSlug: "what-is-tech-pack",
    slugs: [
      "what-is-tech-pack",
      "tech-pack-checklist",
      "how-to-make-tech-pack",
      "flat-sketch-vs-tech-pack",
      "tech-pack-vs-bom",
    ],
    en: {
      title: "Start here · Tech pack basics",
      blurb: "Definitions, checklist, and your first pack from a photo.",
    },
    zh: {
      title: "从这里开始 · 工艺包基础",
      blurb: "定义、检查清单，以及从款式图做第一份包。",
    },
  },
  {
    id: "bom-size",
    hubSlug: "what-is-bom-apparel",
    slugs: [
      "what-is-bom-apparel",
      "how-to-write-garment-bom",
      "what-is-pom-apparel",
      "size-chart-basics",
      "how-to-grade-size-chart",
      "what-is-sample-size-apparel",
      "pants-size-chart-pom",
      "skirt-size-chart-pom",
    ],
    en: {
      title: "BOM & size charts (POM)",
      blurb: "Materials lists, measurement points, sample size, and grading.",
    },
    zh: {
      title: "物料 BOM 与尺码表（POM）",
      blurb: "物料表、测量点、基准码与跳码。",
    },
  },
  {
    id: "annotate-ops",
    hubSlug: "how-to-annotate-garment",
    slugs: [
      "how-to-annotate-garment",
      "how-to-write-construction-notes",
      "print-embroidery-tech-pack",
      "how-to-spec-zipper-trims",
      "how-to-send-tech-pack-to-factory",
      "tech-pack-revision-control",
    ],
    en: {
      title: "Annotate, ops & send",
      blurb: "Callouts, construction notes, trims, sending and revisions.",
    },
    zh: {
      title: "标注、工艺与发送",
      blurb: "引出、工艺说明、辅料规格、发给工厂与版本管理。",
    },
  },
  {
    id: "categories",
    hubSlug: "hoodie-tech-pack-guide",
    slugs: [
      "hoodie-tech-pack-guide",
      "tee-tshirt-tech-pack-guide",
      "shirt-tech-pack-guide",
      "denim-jeans-tech-pack",
      "jacket-tech-pack-guide",
      "down-padded-jacket-tech-pack",
      "dress-tech-pack-guide",
      "skirt-size-chart-pom",
      "pants-size-chart-pom",
      "kids-children-tech-pack",
      "knit-vs-woven-tech-pack",
    ],
    en: {
      title: "By garment category",
      blurb: "Hoodie, tee, shirt, denim, jacket, dress, kids, and more.",
    },
    zh: {
      title: "按服装品类",
      blurb: "卫衣、T 恤、衬衫、牛仔、夹克、裙装、童装等。",
    },
  },
  {
    id: "roles-graduates",
    hubSlug: "first-tech-pack-for-fashion-graduates",
    slugs: [
      "first-tech-pack-for-fashion-graduates",
      "junior-designer-tech-pack-mistakes",
      "tech-pack-portfolio-tips",
      "for-pattern-makers",
      "for-merchandisers",
      "for-export-apparel",
      "how-to-read-factory-comments",
      "how-to-handle-fit-comments",
    ],
    en: {
      title: "By role · Graduates & teams",
      blurb: "Graduates, juniors, pattern, merchandising, export, fit comments.",
    },
    zh: {
      title: "按角色 · 毕业生与团队",
      blurb: "毕业生、新人、版师、跟单、外贸、合身意见。",
    },
  },
  {
    id: "tools-qc",
    hubSlug: "excel-vs-tech-pack-software",
    slugs: [
      "excel-vs-tech-pack-software",
      "ai-tech-pack-tools",
      "common-factory-tech-pack-questions",
      "tech-pack-qc-inspection-checklist",
      "colorway-lab-dip-tech-pack",
      "tech-pack-for-reorders",
    ],
    en: {
      title: "Tools, factory QA & reorders",
      blurb: "Excel vs studio, AI scope, factory FAQ, QC, colorways, reorders.",
    },
    zh: {
      title: "工具、验货与复单",
      blurb: "Excel 对比、AI 边界、工厂问答、质检、色组、复单。",
    },
  },
];

export function getTopicCopy(topic: ArticleTopic, locale?: Locale | string | null) {
  return normalizeLocale(locale) === "en" ? topic.en : topic.zh;
}

export function getArticlesTopicsCopy(locale?: Locale | string | null) {
  const en = normalizeLocale(locale) === "en";
  return en
    ? {
        topicsHeading: "Topic guides",
        topicsLead: "Jump in by theme — each card links core + related deep-dive articles.",
        viewAllInTopic: "Open hub article",
        moreInTopic: "In this topic",
        allBySeries: "All articles by series",
        jumpToSeries: "Jump to series",
      }
    : {
        topicsHeading: "专题入口",
        topicsLead: "按主题进入——每张卡片串起早期总论与后续深挖文。",
        viewAllInTopic: "打开专题代表文",
        moreInTopic: "本专题还有",
        allBySeries: "按系列浏览全部文章",
        jumpToSeries: "跳到系列",
      };
}
