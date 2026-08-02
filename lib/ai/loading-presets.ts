import type { Locale } from "@/lib/i18n/locale";
import { normalizeLocale } from "@/lib/i18n/locale";

export type AiLoadingPresetId =
  | "intake"
  | "questionnaire"
  | "draft"
  | "annotate-process"
  | "fill-bom"
  | "fill-size"
  | "enhance"
  | "explain"
  | "region-annotate"
  | "size-dimension"
  | "view-image"
  | "chat"
  | "default";

export type AiLoadingStep = { icon: string; title: string; desc: string };

export type AiLoadingPreset = {
  title: string;
  subtitle: string;
  steps: AiLoadingStep[];
  tips: string[];
};

const ZH: Record<AiLoadingPresetId, AiLoadingPreset> = {
  intake: {
    title: "AI 正在理解你的款式",
    subtitle: "通常需要 15–40 秒，请勿关闭或重复提交",
    steps: [
      { icon: "📷", title: "读取图片", desc: "识别款式轮廓与主要结构" },
      { icon: "🔍", title: "分析品类", desc: "判断平铺/模特/拼贴，识别可见款式" },
      { icon: "✨", title: "提取要点", desc: "归纳工艺与款式亮点" },
      { icon: "📝", title: "准备下一步", desc: "生成后续引导内容" },
    ],
    tips: [
      "会识别照片类型；模特图或多件服装时需后续确认目标单款",
      "你可以用大白话描述，不需要专业术语",
      "AI 处理中请稍候，避免重复点击",
    ],
  },
  questionnaire: {
    title: "AI 正在准备补充问题",
    subtitle: "约 10–20 秒，请稍候",
    steps: [
      { icon: "💬", title: "梳理信息", desc: "检查已知的款式描述与图片" },
      { icon: "❓", title: "生成问题", desc: "用大白话列出需要确认的点" },
    ],
    tips: ["问题尽量简短，方便你快速回答", "AI 处理中请勿切换页面"],
  },
  draft: {
    title: "AI 正在生成工艺包初稿",
    subtitle: "通常需要 30–60 秒，请勿关闭页面",
    steps: [
      { icon: "⚙️", title: "工艺结构", desc: "生成主要部位工艺说明" },
      { icon: "🧵", title: "物料清单", desc: "列出主要面辅料" },
      { icon: "📐", title: "画布标注", desc: "在款式图上标注结构区域" },
      { icon: "📏", title: "尺寸估算", desc: "解析测量点并估算基准码" },
    ],
    tips: [
      "初稿可在画板中继续修改",
      "生成完成后会直接进入工作台",
      "请勿重复点击提交按钮",
    ],
  },
  "annotate-process": {
    title: "AI 正在标工艺",
    subtitle: "识别结构区域并写入工艺 tab，约 15–30 秒",
    steps: [
      { icon: "🎯", title: "定位部位", desc: "在款式图上识别主要结构区域" },
      { icon: "📋", title: "填写工艺", desc: "生成部位名称与工艺描述" },
      { icon: "🔗", title: "建立关联", desc: "将区域与工艺行关联" },
    ],
    tips: ["处理中画布已锁定，请勿手动标注", "完成后可在工艺 tab 核对"],
  },
  "fill-bom": {
    title: "AI 正在填物料",
    subtitle: "生成 BOM 清单，约 15–30 秒",
    steps: [
      { icon: "🧶", title: "识别面辅料", desc: "根据款式与工艺推断物料" },
      { icon: "📦", title: "整理清单", desc: "分类填写规格与用量" },
    ],
    tips: ["不会删除已有物料，只补充新条目", "完成后请核对物料 tab"],
  },
  "fill-size": {
    title: "AI 正在填尺寸",
    subtitle: "解析测量点、估算基准码并标注尺寸线，约 30–60 秒",
    steps: [
      { icon: "📏", title: "选定测量点", desc: "按区域标准解析 POM" },
      { icon: "🔢", title: "估算数值", desc: "结合款式图估算基准码尺寸" },
      { icon: "↔", title: "标注尺寸线", desc: "在款式图上绘制各测量点尺寸线" },
    ],
    tips: ["尺寸线为蓝色 AI 标注，已有部位不会重复标注", "完成后请核对尺寸 tab 与画布"],
  },
  enhance: {
    title: "AI 正在一键补全",
    subtitle: "补全工艺、物料、尺寸空白项，约 20–40 秒",
    steps: [
      { icon: "🔎", title: "检查缺口", desc: "扫描 Tech Pack 缺失项" },
      { icon: "✅", title: "补充内容", desc: "在不删除已有内容前提下补全" },
    ],
    tips: ["仅补充缺失项，不会覆盖你的修改"],
  },
  explain: {
    title: "AI 正在生成款式评语",
    subtitle: "约 5–15 秒",
    steps: [{ icon: "📝", title: "撰写评语", desc: "款式特点·面料·工艺·注意事项" }],
    tips: ["评语将显示在数据面板「评语」Tab", "四段式结构，控制在字数上限内"],
  },
  "region-annotate": {
    title: "AI 正在识别选中区域",
    subtitle: "约 10–20 秒",
    steps: [
      { icon: "🔲", title: "分析区域", desc: "识别框选部位的结构" },
      { icon: "📝", title: "填写工艺", desc: "生成该部位的工艺说明" },
    ],
    tips: ["处理中请勿移动或删除选区"],
  },
  "size-dimension": {
    title: "AI 正在识别尺寸线",
    subtitle: "约 10–20 秒",
    steps: [
      { icon: "📏", title: "分析尺寸线", desc: "识别测量部位与量法" },
      { icon: "🔢", title: "估算数值", desc: "填入基准码 cm 值" },
    ],
    tips: ["处理中请勿移动或删除尺寸线"],
  },
  "view-image": {
    title: "AI 正在生成款式视角图",
    subtitle: "生图可能需要 30–90 秒，请耐心等待",
    steps: [
      { icon: "🖼", title: "理解参考图", desc: "分析本次选定的参考款式图结构与细节" },
      { icon: "🎨", title: "生成视角", desc: "绘制背面/线稿/细节等目标图" },
      { icon: "📌", title: "排列画布", desc: "自动添加到画板区域" },
    ],
    tips: ["生图较慢，请勿重复点击", "完成后新画板会出现在画布上", "提示页预览图即为本次送入 AI 的参考图"],
  },
  chat: {
    title: "AI 助手正在回复",
    subtitle: "约 5–20 秒",
    steps: [{ icon: "💬", title: "理解指令", desc: "分析你的修改需求" }],
    tips: ["回复可能包含工艺、物料或尺寸的更新"],
  },
  default: {
    title: "AI 正在处理",
    subtitle: "请稍候，请勿重复操作",
    steps: [{ icon: "🤖", title: "处理中", desc: "AI 正在完成你的请求" }],
    tips: ["处理完成前请勿关闭页面"],
  },
};

const EN: Record<AiLoadingPresetId, AiLoadingPreset> = {
  intake: {
    title: "AI is reading your style",
    subtitle: "Usually 15–40s — don’t close or resubmit",
    steps: [
      { icon: "📷", title: "Read image", desc: "Outline & main construction" },
      { icon: "🔍", title: "Detect type", desc: "Flat / model / collage" },
      { icon: "✨", title: "Key points", desc: "Ops & style highlights" },
      { icon: "📝", title: "Next steps", desc: "Prepare follow-up prompts" },
    ],
    tips: [
      "Model or multi-garment shots may need you to confirm the target piece",
      "Plain language is fine — no jargon required",
      "Please wait; avoid double-clicks",
    ],
  },
  questionnaire: {
    title: "AI is preparing questions",
    subtitle: "About 10–20s",
    steps: [
      { icon: "💬", title: "Review info", desc: "Check description & image" },
      { icon: "❓", title: "Draft Qs", desc: "Short confirmations to ask" },
    ],
    tips: ["Keep answers short", "Don’t navigate away while AI runs"],
  },
  draft: {
    title: "AI is drafting the tech pack",
    subtitle: "Usually 30–60s — keep this page open",
    steps: [
      { icon: "⚙️", title: "Construction", desc: "Main part ops notes" },
      { icon: "🧵", title: "BOM", desc: "Key fabrics & trims" },
      { icon: "📐", title: "Canvas marks", desc: "Structure regions on image" },
      { icon: "📏", title: "Size estimate", desc: "POMs & sample size" },
    ],
    tips: [
      "You can edit the draft on canvas",
      "Studio opens when done",
      "Don’t click submit again",
    ],
  },
  "annotate-process": {
    title: "AI Ops in progress",
    subtitle: "Finding regions & writing ops · ~15–30s",
    steps: [
      { icon: "🎯", title: "Locate parts", desc: "Main structure boxes" },
      { icon: "📋", title: "Write ops", desc: "Part names & methods" },
      { icon: "🔗", title: "Link rows", desc: "Tie boxes to ops lines" },
    ],
    tips: ["Canvas locked — don’t annotate yet", "Review in Ops tab when done"],
  },
  "fill-bom": {
    title: "AI BOM in progress",
    subtitle: "Building BOM · ~15–30s",
    steps: [
      { icon: "🧶", title: "Materials", desc: "Infer fabrics & trims" },
      { icon: "📦", title: "List", desc: "Spec & usage fields" },
    ],
    tips: ["Won’t delete existing BOM rows", "Check BOM tab when done"],
  },
  "fill-size": {
    title: "AI Size in progress",
    subtitle: "POMs, sample size & dimension lines · ~30–60s",
    steps: [
      { icon: "📏", title: "Pick POMs", desc: "By region standard" },
      { icon: "🔢", title: "Estimate", desc: "Sample-size cm values" },
      { icon: "↔", title: "Draw lines", desc: "Blue AI dimension lines" },
    ],
    tips: ["Existing linked parts won’t duplicate", "Check Sizes tab + canvas"],
  },
  enhance: {
    title: "AI Enhance in progress",
    subtitle: "Fill gaps in ops / BOM / sizes · ~20–40s",
    steps: [
      { icon: "🔎", title: "Find gaps", desc: "Scan missing fields" },
      { icon: "✅", title: "Fill in", desc: "Add without deleting yours" },
    ],
    tips: ["Only fills blanks — won’t overwrite your edits"],
  },
  explain: {
    title: "AI Remarks in progress",
    subtitle: "About 5–15s",
    steps: [
      { icon: "📝", title: "Write notes", desc: "Features · fabric · ops · risks" },
    ],
    tips: ["Shows in Notes tab", "Four sections, within length limit"],
  },
  "region-annotate": {
    title: "AI reading selection",
    subtitle: "About 10–20s",
    steps: [
      { icon: "🔲", title: "Analyze", desc: "Structure in the box" },
      { icon: "📝", title: "Write ops", desc: "Part construction note" },
    ],
    tips: ["Don’t move or delete the selection"],
  },
  "size-dimension": {
    title: "AI reading size line",
    subtitle: "About 10–20s",
    steps: [
      { icon: "📏", title: "Analyze", desc: "POM & measure method" },
      { icon: "🔢", title: "Estimate", desc: "Sample-size cm value" },
    ],
    tips: ["Don’t move or delete the size line"],
  },
  "view-image": {
    title: "AI generating view",
    subtitle: "Image gen may take 30–90s",
    steps: [
      { icon: "🖼", title: "Read ref", desc: "Selected style image" },
      { icon: "🎨", title: "Draw view", desc: "Back / line / detail…" },
      { icon: "📌", title: "Place board", desc: "Add to canvas" },
    ],
    tips: [
      "Slow — don’t double-click",
      "New artboard appears when done",
      "Preview shows the ref sent to AI",
    ],
  },
  chat: {
    title: "Assistant is replying",
    subtitle: "About 5–20s",
    steps: [{ icon: "💬", title: "Understand", desc: "Parse your request" }],
    tips: ["Reply may update ops, BOM, or sizes"],
  },
  default: {
    title: "AI working",
    subtitle: "Please wait — don’t repeat the action",
    steps: [{ icon: "🤖", title: "Working", desc: "Finishing your request" }],
    tips: ["Keep this page open until done"],
  },
};

export const AI_LOADING_PRESETS = ZH;

export function getAiLoadingPreset(
  id?: AiLoadingPresetId | null,
  locale?: Locale | string | null,
): AiLoadingPreset {
  const map = normalizeLocale(locale) === "en" ? EN : ZH;
  return map[id ?? "default"];
}

/** 按任务标签微调生图 overlay 副标题 */
export function viewImageSubtitleForTask(
  taskLabel?: string,
  locale?: Locale | string | null,
): string | undefined {
  const t = taskLabel?.trim();
  if (!t) return undefined;
  const en = normalizeLocale(locale) === "en";
  if (en) {
    if (/flat|平铺/i.test(t)) return `Generating “${t}” · ~30–90s · original upload`;
    if (/line|线稿/i.test(t)) return `Generating “${t}” · ~30–90s · from color view`;
    return `Generating “${t}” · ~30–90s`;
  }
  if (/平铺/.test(t)) return `正在生成「${t}」，约 30–90 秒 · 参考原上传图`;
  if (/线稿/.test(t)) return `正在生成「${t}」，约 30–90 秒 · 描摹选定彩图`;
  return `正在生成「${t}」，约 30–90 秒，请耐心等待`;
}
