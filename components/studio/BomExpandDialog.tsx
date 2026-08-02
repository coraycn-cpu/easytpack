"use client";

import DataExpandShell from "@/components/studio/DataExpandShell";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BomItem } from "@/types/process";

type BomExpandDialogProps = {
  open: boolean;
  onClose: () => void;
  items: BomItem[];
  onChange: (items: BomItem[]) => void;
};

const BOM_CATEGORY_VALUES: BomItem["category"][] = [
  "fabric",
  "trim",
  "accessory",
  "packaging",
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
  const { t } = useLocale();
  const bomCategories = BOM_CATEGORY_VALUES.map((value) => ({
    value,
    label: t(`panel.${value}`),
  }));

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
      title={t("panel.bomTitle")}
      subtitle={t("panel.bomSubtitle")}
      footerLeft={
        <button
          type="button"
          onClick={add}
          className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-[11px] text-slate-600 hover:border-slate-400"
        >
          {t("panel.addBom")}
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500">
              <th className="px-1.5 py-2 font-medium">{t("panel.name")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.categoryCol")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.partCol")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.spec")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.color")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.qty")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.supplier")}</th>
              <th className="px-1.5 py-2 font-medium">{t("panel.codeCol")}</th>
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
                    placeholder={t("panel.materialName")}
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
                    {bomCategories.map((c) => (
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
                    placeholder={t("panel.garmentPart")}
                    className="w-full min-w-[64px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.spec ?? ""}
                    onChange={(e) => update(i, { spec: e.target.value })}
                    placeholder={t("panel.spec")}
                    className="w-full min-w-[120px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.color ?? ""}
                    onChange={(e) => update(i, { color: e.target.value })}
                    placeholder={t("panel.color")}
                    className="w-full min-w-[64px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.usage ?? ""}
                    onChange={(e) => update(i, { usage: e.target.value })}
                    placeholder={t("panel.qty")}
                    className="w-full min-w-[72px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.supplier ?? ""}
                    onChange={(e) => update(i, { supplier: e.target.value })}
                    placeholder={t("panel.supplier")}
                    className="w-full min-w-[72px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <input
                    value={item.code ?? ""}
                    onChange={(e) => update(i, { code: e.target.value })}
                    placeholder={t("panel.materialCode")}
                    className="w-full min-w-[72px] rounded border border-slate-200 px-1.5 py-1 outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-1 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-slate-300 hover:text-red-500"
                    title={t("common.delete")}
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
            {t("panel.bomEmpty")}
          </p>
        )}
      </div>
    </DataExpandShell>
  );
}
