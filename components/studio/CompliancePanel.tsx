"use client";

import type { ComplianceIssue } from "@/lib/project/compliance";

export default function CompliancePanel({
  issues,
  flat,
  compact,
  onIssueClick,
}: {
  issues: ComplianceIssue[];
  flat?: boolean;
  compact?: boolean;
  onIssueClick?: (issue: ComplianceIssue) => void;
}) {
  const textSize = compact ? "text-[10px] leading-snug" : "text-xs";
  const itemPad = compact ? "px-1.5 py-1" : flat ? "px-2 py-1.5" : "px-3 py-2";
  const box = flat ? `border ${itemPad}` : `rounded-lg ${itemPad}`;
  const gap = compact ? "space-y-1" : "space-y-1.5";
  const clickable = Boolean(onIssueClick);

  if (issues.length === 0) {
    return (
      <div
        className={`${textSize} text-green-700 ${itemPad} ${
          flat ? "border border-green-200 bg-green-50" : "rounded-lg bg-green-50"
        }`}
      >
        工艺包检查通过，可以定稿导出
      </div>
    );
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const renderIssue = (issue: ComplianceIssue, key: string, tone: "error" | "warning") => {
    const colors =
      tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
    const interactive =
      clickable && issue.action
        ? "cursor-pointer hover:ring-1 hover:ring-blue-300"
        : "";
    return (
      <button
        key={key}
        type="button"
        disabled={!clickable || !issue.action}
        onClick={() => onIssueClick?.(issue)}
        className={`${box} ${colors} ${interactive} w-full text-left disabled:cursor-default`}
        title={
          issue.action
            ? `${issue.message}（点击跳转处理）`
            : issue.message
        }
      >
        {issue.message}
        {clickable && issue.action ? (
          <span className="ml-1 opacity-60">→</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className={`${gap} ${textSize}`}>
      {errors.map((issue, i) => renderIssue(issue, `e-${i}`, "error"))}
      {warnings.map((issue, i) => renderIssue(issue, `w-${i}`, "warning"))}
    </div>
  );
}
