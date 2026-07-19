"use client";

import DataExpandShell from "@/components/studio/DataExpandShell";
import type { BomItem } from "@/types/process";

type BomExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  items: BomItem[];
  onChange: (items: BomItem[]) => void;
};

const BOM_CATEGORIES: Array<{ value: BomItem["category"]; label: string }> = [
  { value: "fabric", label: "面料" },
  { value: "trim", label: "辅料" },
  { value: "accessory", label: "配件" },
  { value: "packaging", label: "包装" },
];

const EMPTY: BomItem = {
  name: "",
  category: "fabric",
  garmentPart: "",
  spec: "",
  color: "",
  usage: "",
  supplier: "",
  code: "",
};

export default function BomExpandDialog({
  open,
  onClose,
  items,
  onChange,
}: BomExpandDialogProps) {
  const update = (index: number, patch: Partial<BomItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const add = () => onChange([...items, { ...EMPTY }]);

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <DataExpandShell
      open={open}
      onClose={onClose}
      title="物料清单"
      subtitle="大面板编辑面辅料，修改即时保存；点「完成」关闭面板。"
      footerLeft={
        <button
          type="button"
          onClick={add}
          className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-[11px] text-slate-600 hover:border-slate-400"
        >
          + 添加物料行
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500">
              <th className="px-1.5 py-2 font-medium">名称</th>
              <th className="px-1.5 py-2 font-medium">类别</th>
              <th className="px-1.5 py-2 font-medium">部位</th>
              <th className="px-1.5 py-2 font-medium">规格</th>
              <th className="px-1.5 py-2 font-medium">颜色</th>
              <th className="px-1.5 py-2 font-medium">用量</th>
              <th className="px-1.5 py-2 font-medium">供应商</th>
              <th className="px-1.5 py-2 font-medium">编码</th>
              <th className="w-8 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100 align-top">
                <td className="px-1 py-1.5">
                  <input
                    value={item.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="物料名称"
                    className="w-full min-w-[100px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <select
                    value={item.category ?? "fabric"}
                    onChange={(e) =>
                      update(i, {
                        category: e.target.value as BomItem["category"],
                      })
                    }
                    className="w-full rounded border border-slate-200 px-1 py-1 outline-none focus:border-blue-400"
                  >
                    {BOM_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.garmentPart ?? ""}
                    onChange={(e) => update(i, { garmentPart: e.target.value })}
                    placeholder="上装/下装"
                    className="w-full min-w-[64px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.spec ?? ""}
                    onChange={(e) => update(i, { spec: e.target.value })}
                    placeholder="规格"
                    className="w-full min-w-[120px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.color ?? ""}
                    onChange={(e) => update(i, { color: e.target.value })}
                    placeholder="颜色"
                    className="w-full min-w-[64px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.usage ?? ""}
                    onChange={(e) => update(i, { usage: e.target.value })}
                    placeholder="用量"
                    className="w-full min-w-[72px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.supplier ?? ""}
                    onChange={(e) => update(i, { supplier: e.target.value })}
                    placeholder="供应商"
                    className="w-full min-w-[72px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.code ?? ""}
                    onChange={(e) => update(i, { code: e.target.value })}
                    placeholder="编码"
                    className="w-full min-w-[72px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-slate-300 hover:text-red-500"
                    title="删除"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="py-10 text-center text-xs text-slate-400">
            暂无物料，可添加行或使用「一键补全」
          </p>
        )}
      </div>
    </DataExpandShell>
  );
}
