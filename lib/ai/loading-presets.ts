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

export const AI_LOADING_PRESETS: Record<AiLoadingPresetId, AiLoadingPreset> = {
  intake: {
    title: "AI 正在理解你的款式",
    subtitle: "通常需要 15–40 秒，请勿关闭或重复提交",
    steps: [
      { icon: "📷", title: "读取图片", desc: "识别款式轮廓与主要结构" },
      { icon: "🔍", title: "分析品类", desc: "判断品类与廓形特征" },
      { icon: "✨", title: "提取要点", desc: "归纳工艺与款式亮点" },
      { icon: "📝", title: "准备下一步", desc: "生成后续引导内容" },
    ],
    tips: [
      "图片越清晰，分析越准确",
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
    subtitle: "解析测量点并估算基准码，约 20–40 秒",
    steps: [
      { icon: "📏", title: "选定测量点", desc: "按区域标准解析 POM" },
      { icon: "🔢", title: "估算数值", desc: "结合款式图估算基准码尺寸" },
    ],
    tips: ["其他尺码列预留给跳码功能", "完成后请核对尺寸 tab"],
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
    tips: ["评语将显示在数据面板「评语」Tab", "四段式结构，控制在 280 字以内"],
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
  "view-image": {
    title: "AI 正在生成款式视角图",
    subtitle: "生图可能需要 30–90 秒，请耐心等待",
    steps: [
      { icon: "🖼", title: "理解正面图", desc: "分析款式结构与细节" },
      { icon: "🎨", title: "生成视角", desc: "绘制背面/侧面/细节图" },
      { icon: "📌", title: "排列画布", desc: "自动添加到画板区域" },
    ],
    tips: ["生图较慢，请勿重复点击", "完成后新画板会出现在画布上"],
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

export function getAiLoadingPreset(id?: AiLoadingPresetId | null): AiLoadingPreset {
  return AI_LOADING_PRESETS[id ?? "default"];
}
