import { originalIntentAnalysis } from "@/lib/ai/chat-context";
import type { TechPackProject } from "@/types/project";

/**
 * 识别不应出现在导出/给版师客户看的「过程说明」文案
 * （如：用户上传了…、需要对其分析、已生成：3 个工艺…）
 */
export function looksLikeInternalProcessCopy(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /用户上传|需要对其|对其进行款式|仅上传了|请分析(图片|款式)|已生成[：:]|初稿说明|AI 初稿|请在画板|请在画布|还需要(他们|您)确认|补了什么|友好语气|识图摘要/.test(
    t,
  );
}

/** 从款式字段拼一句话专业描述（不含「用户上传」类过程话） */
export function composeStyleBriefFromIntake(
  project: Pick<TechPackProject, "title" | "intake">,
): string {
  const label =
    project.intake.targetGarment?.label?.trim() ||
    project.intake.suggestedTitle?.trim() ||
    project.title?.trim() ||
    "";
  const category =
    project.intake.targetGarment?.category?.trim() ||
    project.intake.detectedCategory?.trim() ||
    "";
  const features = (project.intake.detectedFeatures ?? [])
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 5);

  const bits: string[] = [];
  if (label) bits.push(label);
  if (category && (!label || !label.includes(category))) bits.push(category);
  if (features.length) bits.push(features.join("、"));
  return bits.join(" · ");
}

/**
 * 导出封面「款式说明」：优先用户手写描述，否则用款名/品类/特征，
 * 绝不回落成「用户上传了图片需要分析」类识图过程话。
 */
export function buildExportStyleBrief(project: TechPackProject): string {
  const desc = project.intake.description?.trim() ?? "";
  if (desc && !looksLikeInternalProcessCopy(desc)) return desc;

  const composed = composeStyleBriefFromIntake(project);
  if (composed) return composed;

  const analysis = originalIntentAnalysis(project.intake.aiIntentAnalysis);
  if (analysis && !looksLikeInternalProcessCopy(analysis)) return analysis;

  return "";
}

/**
 * 导出「协作注意 / 款式评语」：去掉误写入的「初稿说明：已生成…」等内部状态。
 */
export function sanitizeExportReview(text: string | undefined | null): string {
  let t = (text ?? "").trim();
  if (!t) return "";
  t = t.replace(/^初稿说明[：:]\s*/u, "").trim();
  if (!t) return "";
  if (looksLikeInternalProcessCopy(t)) return "";
  if (/^已生成[：:]/.test(t)) return "";
  return t;
}

/** 导出用项目描述（xlsx 元信息等） */
export function buildExportDescription(project: TechPackProject): string {
  return buildExportStyleBrief(project);
}
