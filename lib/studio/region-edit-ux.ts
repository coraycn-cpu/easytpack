/** 选区生绘 / 整图修正共用的轻量预设（点选写入输入框，不改强制流程） */

export const REGION_EDIT_CHIPS = [
  "去掉假人台/幽灵模特",
  "改成白底真平铺",
  "修领口造型",
  "去掉多余物件",
  "细节更清晰",
] as const;

export const WHOLE_IMAGE_CORRECTION_CHIPS = [
  "去掉假人台改真平铺",
  "白底更干净",
  "只保留目标单件",
  "版型与参考更一致",
] as const;

export const REGION_EDIT_LABELS = {
  rail: "局部",
  railHint: "框选区域后局部重绘（不影响区外与现有标注操作）",
  confirmNext: "下一步",
  cancel: "取消",
  dialogTitle: "选区重绘",
  dialogHint:
    "只改框选区域，区外画面与标注不动。可点预设或自写短句。",
  submit: "开始重绘",
  undoImage: "撤图",
  undoImageHint: "恢复重绘/修正前的上一版图片",
} as const;

export const COMM_PACK_COPY = {
  exportHint:
    "图片供沟通参考，以标注与表格为准；不准处可在画布上标注说明或用「局部」重绘。",
  annotateAfterAi:
    "图不准时：用方框/尺寸/画笔标出说明，或点画板旁「局部」框选重绘。",
  aiDraftBadge: "AI草稿",
  originalBadge: "原图",
  /** 写入评语的快捷说明（点选追加，不覆盖） */
  reviewGuideChips: [
    "袖长以尺寸线为准",
    "口袋位置见图示标注",
    "后中开衩见画布标注",
    "图为沟通示意，细节以标注与表格为准",
  ] as const,
  processEmpty:
    "暂无工艺。可在画布用方框标部位后「AI 标工艺」，或手动添加；图不准处先标注说明。",
  sizeEmpty:
    "暂无尺寸行。可用 AI 填尺寸，或用尺寸线在图上标出；数值以尺码表为准。",
  bomEmpty: "暂无物料，可手动添加或点击「一键补全」",
  dockIdleHint: "图不准就标注说明 · 局部重绘改选区 · 表数据交给版师",
} as const;
