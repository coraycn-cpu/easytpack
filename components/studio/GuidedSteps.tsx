"use client";

const STEPS = [
  { id: 1, title: "标注款式", desc: "在图上标出关键部位和说明" },
  { id: 2, title: "AI 补全", desc: "自动生成工艺、BOM、尺码" },
  { id: 3, title: "检查确认", desc: "看看 AI 建议，改一改" },
  { id: 4, title: "交给版师", desc: "导出专业工艺包" },
];

export default function GuidedSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {STEPS.map((step) => {
        const active = step.id === currentStep;
        const done = step.id < currentStep;
        return (
          <div
            key={step.id}
            className={`flex min-w-[120px] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              active
                ? "bg-blue-600 text-white"
                : done
                  ? "bg-blue-50 text-blue-700"
                  : "bg-zinc-100 text-zinc-500"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                active ? "bg-white/20" : done ? "bg-blue-200" : "bg-zinc-200"
              }`}
            >
              {done ? "✓" : step.id}
            </span>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className={`hidden sm:block ${active ? "text-blue-100" : "text-zinc-400"}`}>
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function inferGuidedStep(project: {
  canvas_data: { artboards: Array<{ annotations: unknown[]; hotspots: unknown[] }> };
  process_items: unknown[];
  size_chart: { rows: unknown[] };
  workflowStatus: string;
}): number {
  const hasAnnotations = project.canvas_data.artboards.some(
    (a) => a.annotations.length > 0 || a.hotspots.length > 0,
  );
  if (!hasAnnotations) return 1;
  if (project.process_items.length < 2 || project.size_chart.rows.length === 0) return 2;
  if (project.workflowStatus === "finalized") return 4;
  return 3;
}
