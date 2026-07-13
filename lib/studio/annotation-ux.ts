/** 画布标注交互文案（单一来源，保持习惯一致） */

export const ANN_COLOR_LEGEND = "蓝 = AI 标注 · 红 = 手动/已改 · 🔒 = 已锁定";

export const ANN_SELECT_HINT =
  "选择工具：点击选中 · Shift+点击 多选 · Delete 删除 · Ctrl+V 贴图 · 拖款式图前先点选图片";

export const ANN_ACTION_LABELS = {
  aiBatchProcess: "AI 标工艺",
  aiBatchProcessHint: "补全空白部位（跳过已有区域）",
  aiRegion: "AI 识别此区域",
  aiRegionRetry: "重新识别此区域",
  aiDimension: "AI 识别此尺寸",
  aiDimensionRetry: "重新识别此尺寸",
  markManual: "标记为手动",
  toggleLock: "锁定",
  toggleUnlock: "解锁",
  deleteSelected: "删除选中",
  insertTemplates: "插入标准部位框",
  insertTemplatesHint: "按品类插入常用工艺框，可拖动调整",
  pasteImage: "贴图",
  pasteImageHint: "粘贴图片到画布（Ctrl+V）· 空画板设主图 · 有图则新建贴图画板",
  cropImage: "剪裁",
  cropImageHint: "拖动选区调整，确认后应用剪裁",
  cropConfirm: "确认剪裁",
  cropCancel: "取消剪裁",
  linkProcessTab: "手动关联工艺",
  linkSizeTab: "手动关联尺寸",
} as const;

export type AnnotationSelectionMode = "none" | "process" | "dimension" | "mixed" | "other";

export function resolveSelectionMode(
  annotations: Array<{ type: string }>,
): AnnotationSelectionMode {
  if (annotations.length === 0) return "none";
  let hasProcess = false;
  let hasDim = false;
  let hasOther = false;
  for (const a of annotations) {
    if (a.type === "dimension") hasDim = true;
    else if (a.type === "rect" || a.type === "circle") hasProcess = true;
    else hasOther = true;
  }
  if (hasProcess && hasDim) return "mixed";
  if (hasProcess) return "process";
  if (hasDim) return "dimension";
  return "other";
}
