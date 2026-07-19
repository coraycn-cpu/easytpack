"use client";

import DataExpandShell from "@/components/studio/DataExpandShell";
import { generateProcessId } from "@/lib/process/ids";
import type { ProcessItem } from "@/types/process";

type ProcessExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  items: ProcessItem[];
  onChange: (items: ProcessItem[]) => void;
};

const EMPTY: ProcessItem = {
  part: "",
  process: "",
  stitch: "",
  seam_allowance: "",
};

export default function ProcessExpandDialog({
  open,
  onClose,
  items,
  onChange,
}: ProcessExpandDialogProps) {
  const update = (index: number, patch: Partial<ProcessItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const add = () => {
    onChange([...items, { ...EMPTY, id: generateProcessId() }]);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <DataExpandShell
      open={open}
      onClose={onClose}
      title="工艺明细"
      subtitle="大面板编辑工艺条目，修改即时保存；点「完成」关闭面板。"
      footerLeft={
        <button
          type="button"
          onClick={add}
          className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-[11px] text-slate-600 hover:border-slate-400"
        >
          + 添加工艺行
        </button>
      }
    >
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={item.id ?? i}
            className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <input
                value={item.part}
                onChange={(e) => update(i, { part: e.target.value })}
                placeholder="部位名称"
                className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 rounded px-2 py-1 text-slate-400 hover:bg-white hover:text-red-500"
                title="删除"
              >
                ×
              </button>
            </div>
            <textarea
              value={item.process}
              onChange={(e) => update(i, { process: e.target.value })}
              placeholder="工艺描述"
              rows={3}
              className="mb-2 w-full resize-y rounded border border-slate-200 bg-white px-2.5 py-2 text-[13px] leading-relaxed text-slate-700 outline-none focus:border-blue-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={item.stitch ?? ""}
                onChange={(e) => update(i, { stitch: e.target.value })}
                placeholder="针法/线迹"
                className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
              />
              <input
                value={item.seam_allowance ?? ""}
                onChange={(e) => update(i, { seam_allowance: e.target.value })}
                placeholder="缝份"
                className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-10 text-center text-xs text-slate-400">
            暂无工艺条目，可点击下方添加或使用 AI 一键标注
          </p>
        )}
      </div>
    </DataExpandShell>
  );
}
