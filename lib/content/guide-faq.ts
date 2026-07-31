import {
  BRAND_CONTACT_EMAIL,
  BRAND_NAME,
  BRAND_SLOGAN,
} from "@/lib/brand";
import { FREE_MONTHLY_AI_GIFT } from "@/lib/ai/login-gate";

/**
 * 功能介绍 / 使用说明 / FAQ 文案（页面与 JSON-LD 共用，便于 SEO / GEO）。
 */
export type GuideFaqItem = {
  question: string;
  answer: string;
};

export const GUIDE_PAGE_PATH = "/guide";

export const GUIDE_PAGE_TITLE = `${BRAND_NAME} 功能介绍与使用说明`;

export const GUIDE_PAGE_DESCRIPTION =
  `${BRAND_NAME} 是${BRAND_SLOGAN}。本页介绍核心功能、从新建款式到导出工艺包的使用步骤，以及常见问题（FAQ）。业务联系：${BRAND_CONTACT_EMAIL}。注册可免费试用。`;

export const GUIDE_FEATURES: Array<{ title: string; body: string }> = [
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
];

export const GUIDE_STEPS: Array<{ title: string; body: string }> = [
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
    body: `注册可免费试用，并领取每月约 ${FREE_MONTHLY_AI_GIFT} 点 AI 额度；也可用云端存档。`,
  },
  {
    title: "导出工艺包",
    body: "在工作台进入导出页，按需要导出预览或文件，发给协作方。",
  },
];

export const GUIDE_FAQ: GuideFaqItem[] = [
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
    answer: `注册可免费试用：领取每月 AI 额度（约 ${FREE_MONTHLY_AI_GIFT} 点，以产品内显示为准），并把项目同步到云端，换设备继续。`,
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
];
