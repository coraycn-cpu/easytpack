import type { ComplianceIssue } from "@/lib/project/compliance";

export type StudioDataTab = "process" | "bom" | "size" | "review";

export type ComplianceNavResult = {
  tab?: StudioDataTab;
  processId?: string;
  /** 提示用户改标题等 */
  tip?: string;
  /** 仅强调画布，不切 Tab */
  focusCanvas?: boolean;
};

/** 将合规问题映射为 Studio 跳转意图（从 studio/page 拆出，便于单测与复用） */
export function resolveComplianceNav(
  issue: ComplianceIssue,
): ComplianceNavResult {
  switch (issue.action) {
    case "process":
      return { tab: "process", processId: issue.processId };
    case "bom":
      return { tab: "bom" };
    case "size":
      return { tab: "size" };
    case "review":
      return { tab: "review" };
    case "title":
      return {
        tip: "请在左侧侧栏项目名称处完善款式名称（当前标题为空）",
        focusCanvas: false,
      };
    case "canvas":
      return {
        tip: "请在画布上补充标注（方框 / 尺寸线 / 画笔）",
        focusCanvas: true,
      };
    default:
      return {};
  }
}
