import {
  BRAND_CONTACT_EMAIL,
  BRAND_NAME,
  BRAND_SHORT_NAME,
  BRAND_SLOGAN,
} from "@/lib/brand";
import { FREE_MONTHLY_AI_GIFT } from "@/lib/ai/login-gate";
import type { Locale } from "@/lib/i18n/locale";
import { normalizeLocale } from "@/lib/i18n/locale";

/**
 * 功能介绍 / 使用说明 / FAQ 文案（页面与 JSON-LD 共用，便于 SEO / GEO）。
 * 内容随界面语言切换；默认 SEO metadata 仍用中文。
 */
export type GuideFaqItem = {
  question: string;
  answer: string;
};

export type GuideSectionItem = {
  title: string;
  body: string;
};

export type GuidePageCopy = {
  pageTitle: string;
  pageDescription: string;
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  navAria: string;
  tocAria: string;
  navHome: string;
  navRegister: string;
  tocFeatures: string;
  tocHowto: string;
  tocFaq: string;
  tocContact: string;
  featuresHeading: string;
  howtoHeading: string;
  howtoCta: string;
  faqHeading: string;
  contactHeading: string;
  contactBodyBefore: string;
  contactBodyAfter: string;
  features: GuideSectionItem[];
  steps: GuideSectionItem[];
  faq: GuideFaqItem[];
  /** JSON-LD / SEO helpers */
  howToName: string;
  freeTrialOffer: string;
};

export const GUIDE_PAGE_PATH = "/guide";

const gift = () => FREE_MONTHLY_AI_GIFT;

function guideZh(): GuidePageCopy {
  const n = gift();
  return {
    pageTitle: `${BRAND_NAME} 功能介绍与使用说明`,
    pageDescription: `${BRAND_NAME} 是${BRAND_SLOGAN}。本页介绍核心功能、从新建款式到导出工艺包的使用步骤，以及常见问题（FAQ）。业务联系：${BRAND_CONTACT_EMAIL}。注册可免费试用。`,
    eyebrow: "功能介绍 · 使用说明 · FAQ",
    heroTitle: `${BRAND_NAME} 怎么用`,
    heroLead: `${BRAND_SLOGAN}。面向服装打版、跟单与工艺沟通场景：从款式图到可交付工艺包，支持手动标注与 AI 辅助；注册可免费试用。`,
    navAria: "页面导航",
    tocAria: "本页目录",
    navHome: "回首页",
    navRegister: "免费注册试用",
    tocFeatures: "功能介绍",
    tocHowto: "使用步骤",
    tocFaq: "常见问题",
    tocContact: "业务联系",
    featuresHeading: "功能介绍",
    howtoHeading: "使用说明（四步开始）",
    howtoCta: "回首页开始新建款式",
    faqHeading: "常见问题 FAQ",
    contactHeading: "业务联系",
    contactBodyBefore: "合作、试用或产品咨询，请发邮件至",
    contactBodyAfter: "。注册可免费试用。",
    features: [
      {
        title: "AI 辅助标注与生图",
        body: "注册后可用一键标注、视角生图、局部重绘等能力，把款式图更快变成可沟通的工艺信息。",
      },
      {
        title: "手动标注不挡路",
        body: "未登录也能用方框、尺寸线、画笔和表格手动标注；本机浏览器会自动保存。",
      },
      {
        title: "云端存档与跨设备",
        body: "登录后可把稿同步到云端，换电脑或手机继续编辑，并查看 AI 额度与同步偏好。",
      },
      {
        title: "导出可交付工艺包",
        body: "支持预览与导出（如 PDF / Excel / 合拼大图等），方便发给版师或工厂沟通。",
      },
    ],
    steps: [
      {
        title: "新建款式并上传正面图",
        body: "在首页点「新建款式」，上传正面款式图，进入工作台画布。",
      },
      {
        title: "标注工艺、物料与尺寸",
        body: "用方框标部位，用尺寸线标尺寸，在右侧面板编辑工艺、物料、尺码表与评语。",
      },
      {
        title: "需要时注册并使用 AI",
        body: `注册可免费试用，并领取每月约 ${n} 点 AI 额度；也可用云端存档。`,
      },
      {
        title: "导出工艺包",
        body: "在工作台进入导出页，按需要导出预览或文件，发给协作方。",
      },
    ],
    faq: [
      {
        question: `${BRAND_NAME} 是做什么的？`,
        answer: `${BRAND_NAME} 是${BRAND_SLOGAN}。面向服装从业者，帮助从款式图更快整理工艺、物料、尺寸，并导出可沟通的工艺包（Techpack）。`,
      },
      {
        question: "不注册能用吗？",
        answer:
          "可以。未登录也能新建款式、手动标注，稿件保存在本机浏览器。使用 AI、云端同步存档需要注册登录。",
      },
      {
        question: "注册有什么好处？",
        answer: `注册可免费试用：领取每月 AI 额度（约 ${n} 点，以产品内显示为准），并把项目同步到云端，换设备继续。`,
      },
      {
        question: "怎么开始第一个工艺包？",
        answer:
          "打开首页 → 点「新建款式」上传正面图 → 在画布标注 → 需要时注册用 AI 或云端存档 → 进入导出页输出工艺包。",
      },
      {
        question: "图片很大或 AI 提示失败怎么办？",
        answer:
          "尽量使用边长约 2000 像素以内、清晰的正面图。若提示参考图无法发送，可稍后再试或重新打开项目；仍不行请发邮件联系我们并说明操作步骤。",
      },
      {
        question: "业务咨询怎么联系？",
        answer: `业务联系邮箱：${BRAND_CONTACT_EMAIL}。欢迎来信说明合作或试用需求。`,
      },
    ],
    howToName: `如何用 ${BRAND_NAME} 生成工艺包`,
    freeTrialOffer: "注册可免费试用",
  };
}

function guideEn(): GuidePageCopy {
  const n = gift();
  const name = BRAND_SHORT_NAME;
  const slogan =
    "AI-assisted tech-pack (工艺包) studio for apparel — from style photos to factory-ready packs";
  return {
    pageTitle: `${name} — Features, how-to & FAQ`,
    pageDescription: `${name}: ${slogan}. Learn core features, steps from new style to export, and FAQ. Contact: ${BRAND_CONTACT_EMAIL}. Free to register.`,
    eyebrow: "Features · How-to · FAQ",
    heroTitle: `How to use ${name}`,
    heroLead: `${slogan}. Built for pattern, merchandising, and factory communication: annotate manually or with AI; register for a free trial.`,
    navAria: "Page navigation",
    tocAria: "On this page",
    navHome: "Home",
    navRegister: "Register free",
    tocFeatures: "Features",
    tocHowto: "How to start",
    tocFaq: "FAQ",
    tocContact: "Contact",
    featuresHeading: "Features",
    howtoHeading: "How to start (4 steps)",
    howtoCta: "Go home · create a style",
    faqHeading: "FAQ",
    contactHeading: "Business contact",
    contactBodyBefore: "For partnership, trials, or product questions, email",
    contactBodyAfter: ". Register for a free trial.",
    features: [
      {
        title: "AI annotate & view gen",
        body: "After sign-in: one-tap pack fill, view generation, region redraw — turn style photos into clear tech-pack info faster.",
      },
      {
        title: "Manual marks always work",
        body: "Guests can use boxes, size lines, brush, and tables. Drafts auto-save in this browser.",
      },
      {
        title: "Cloud sync across devices",
        body: "Signed-in users sync styles to the cloud, continue on another device, and manage AI quota & sync prefs.",
      },
      {
        title: "Export deliverable packs",
        body: "Preview and export (PDF / Excel / composite images, etc.) for pattern makers or factories.",
      },
    ],
    steps: [
      {
        title: "Create a style & upload a front photo",
        body: "On Home, tap New style, upload a clear front image, then open the studio canvas.",
      },
      {
        title: "Mark ops, BOM & sizes",
        body: "Box parts, draw size lines, and edit ops, BOM, size chart, and remarks in the right panel.",
      },
      {
        title: "Register when you need AI",
        body: `Free trial includes about ${n} AI pts/month; cloud save is available after sign-in.`,
      },
      {
        title: "Export the tech pack",
        body: "Open Export from the studio and download what you need for collaborators.",
      },
    ],
    faq: [
      {
        question: `What is ${name}?`,
        answer: `${name} is ${slogan}. For apparel teams: organize ops, BOM, and sizes from style photos, then export a shareable tech pack.`,
      },
      {
        question: "Can I use it without registering?",
        answer:
          "Yes. Guests can create styles and annotate manually; drafts stay in this browser. AI and cloud sync require sign-in.",
      },
      {
        question: "Why register?",
        answer: `Free trial with monthly AI quota (about ${n} pts — see Account for the live number) plus cloud sync so you can continue on other devices.`,
      },
      {
        question: "How do I make my first tech pack?",
        answer:
          "Home → New style → upload a front photo → annotate on canvas → register for AI/cloud if needed → Export the pack.",
      },
      {
        question: "Large images or AI errors?",
        answer:
          "Prefer clear front photos under ~2000px on the long edge. If a ref image fails to send, retry later or reopen the project; still stuck — email us with the steps you took.",
      },
      {
        question: "How do I contact you?",
        answer: `Business email: ${BRAND_CONTACT_EMAIL}. Tell us about partnership or trial needs.`,
      },
    ],
    howToName: `How to build a tech pack with ${name}`,
    freeTrialOffer: "Free to register",
  };
}

/** Full guide copy for UI (and optional locale-aware JSON-LD). */
export function getGuideContent(locale?: Locale | string | null): GuidePageCopy {
  return normalizeLocale(locale) === "en" ? guideEn() : guideZh();
}

/** @deprecated Prefer getGuideContent(locale) — kept for SEO defaults (zh). */
export const GUIDE_PAGE_TITLE = guideZh().pageTitle;

/** @deprecated Prefer getGuideContent(locale) */
export const GUIDE_PAGE_DESCRIPTION = guideZh().pageDescription;

/** @deprecated Prefer getGuideContent(locale).features */
export const GUIDE_FEATURES = guideZh().features;

/** @deprecated Prefer getGuideContent(locale).steps */
export const GUIDE_STEPS = guideZh().steps;

/** @deprecated Prefer getGuideContent(locale).faq */
export const GUIDE_FAQ = guideZh().faq;
