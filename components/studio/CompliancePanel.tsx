"use client";

import type { ComplianceIssue } from "@/lib/project/compliance";

export default function CompliancePanel({
  issues,
  flat,
}: {
  issues: ComplianceIssue[];
  flat?: boolean;
}) {
  if (issues.length === 0) {
    return (
      <div
        className={`px-2 py-2 text-xs text-green-700 ${
          flat ? "border border-green-200 bg-green-50" : "rounded-lg bg-green-50"
        }`}
      >
        工艺包检查通过，可以定稿导出
      </div>
    );
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const box = flat ? "border px-2 py-1.5" : "rounded-lg px-3 py-2";

  return (
    <div className="space-y-1.5 text-xs">
      {errors.map((issue, i) => (
        <div key={`e-${i}`} className={`${box} border-red-200 bg-red-50 text-red-700`}>
          {issue.message}
        </div>
      ))}
      {warnings.map((issue, i) => (
        <div key={`w-${i}`} className={`${box} border-amber-200 bg-amber-50 text-amber-700`}>
          {issue.message}
        </div>
      ))}
    </div>
  );
}
