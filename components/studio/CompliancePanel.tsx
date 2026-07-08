"use client";

import type { ComplianceIssue } from "@/lib/project/compliance";

export default function CompliancePanel({ issues }: { issues: ComplianceIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
        工艺包检查通过，可以定稿导出
      </div>
    );
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <div className="space-y-2 text-xs">
      {errors.map((issue, i) => (
        <div key={`e-${i}`} className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {issue.message}
        </div>
      ))}
      {warnings.map((issue, i) => (
        <div key={`w-${i}`} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
          {issue.message}
        </div>
      ))}
    </div>
  );
}
