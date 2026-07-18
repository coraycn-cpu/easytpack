/** B 区 AI 生图：写入文本 prompt 与图像 API 的硬约束说明 */
export const VIEW_IMAGE_FIDELITY_RULES = `
硬约束（必须遵守）：
1. 版型、轮廓、面料质感、颜色、工艺细节与参考正面图完全一致，不得臆造、简化或改变任何款式特征
2. 袖长/裙长/领口必须与参考一致（短袖不得变中袖或长袖；花型朝向、条纹方向、印花比例不得改写）
3. 输出图像宽高比例与参考主图一致，平铺/挂拍尺度与主图相同，主体占画面比例一致
4. 真实服装工艺单摄影风格：白底或中性背景、无模特、无水印、studio 柔光、高细节
`.trim();

export const VIEW_IMAGE_CORRECTION_PREFIX = "用户修正要求（优先满足）：";

export function appendCorrectionToPrompt(
  basePrompt: string,
  correctionPrompt?: string,
): string {
  const fix = correctionPrompt?.trim();
  if (!fix) return basePrompt;
  return `${basePrompt}\n${VIEW_IMAGE_CORRECTION_PREFIX}${fix}`;
}
