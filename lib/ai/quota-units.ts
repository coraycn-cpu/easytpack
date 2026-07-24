/**
 * AI 点数计价（前后端共用口径）
 * - 普通文本/分析类：1 点 / 次成功
 * - 视角生图（含平铺正面、背面等）：5 点 / 次成功
 * - 一键全量标注：串多个接口，预估约 6 点（问卷+工艺+物料+尺码+尺寸线+评语）
 */

import type { AiMeterAction } from "@/lib/ai/metering";

/** 默认：一次成功 AI 调用 */
export const AI_UNITS_DEFAULT = 1;

/** 视角生图（/api/ai/view-image）成功一次 */
export const AI_UNITS_VIEW_IMAGE = 5;

/**
 * 一键全量标注预估消耗（成功路径）：
 * questionnaire + annotate-batch + bom + size-chart + size-dimension-batch + style-review
 */
export const AI_UNITS_FULL_COLLECT_ESTIMATE = 6;

export function aiUnitsForAction(action: AiMeterAction | string): number {
  if (action === "view-image") return AI_UNITS_VIEW_IMAGE;
  return AI_UNITS_DEFAULT;
}

export function fullCollectCostHint(): string {
  return `大约消耗 ${AI_UNITS_FULL_COLLECT_ESTIMATE} 点 AI（问卷与多项生成；实际以成功调用为准）`;
}
