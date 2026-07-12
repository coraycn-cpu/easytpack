"use client";

import type { ComplianceIssue } from "@/lib/project/compliance";

export default function CompliancePanel({
  issues,
  flat,
  compact,
}: {
  issues: ComplianceIssue[];
  flat?: boolean;
  compact?: boolean;
}) {
  const textSize = compact ? "text-[10px] leading-snug" : "text-xs";
  const itemPad = compact ? "px-1.5 py-1" : flat ? "px-2 py-1.5" : "px-3 py-2";
  const box = flat ? `border ${itemPad}` : `rounded-lg ${itemPad}`;
  const gap = compact ? "space-y-1" : "space-y-1.5";

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

  return (
    <div className={`${gap} ${textSize}`}>
      {errors.map((issue, i) => (
        <div
          key={`e-${i}`}
          className={`${box} border-red-200 bg-red-50 text-red-700`}
          title={issue.message}
        >
          {issue.message}
        </div>
      ))}
      {warnings.map((issue, i) => (
        <div
          key={`w-${i}`}
          className={`${box} border-amber-200 bg-amber-50 text-amber-700`}
          title={issue.message}
        >
          {issue.message}
        </div>
      ))}
    </div>
  );
}
