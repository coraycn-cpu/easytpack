export type SizeRegionStandard = "cn" | "eu" | "us" | "uk" | "jp";

export const SIZE_REGION_OPTIONS: Array<{
  id: SizeRegionStandard;
  label: string;
  hint: string;
  defaultSizes: string[];
  sampleDefault: string;
}> = [
  {
    id: "cn",
    label: "国标 GB",
    hint: "S/M/L/XL 字母码或 160/165/170 身高码",
    defaultSizes: ["S", "M", "L", "XL"],
    sampleDefault: "M",
  },
  {
    id: "eu",
    label: "欧码 EU",
    hint: "XS–XL 或 36/38/40 数字码",
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    sampleDefault: "M",
  },
  {
    id: "us",
    label: "美码 US",
    hint: "XS–XL 或 0/2/4/6 数字码",
    defaultSizes: ["XS", "S", "M", "L", "XL"],
    sampleDefault: "M",
  },
  {
    id: "uk",
    label: "英码 UK",
    hint: "6/8/10/12 或 S/M/L",
    defaultSizes: ["8", "10", "12", "14"],
    sampleDefault: "10",
  },
  {
    id: "jp",
    label: "日码 JP",
    hint: "S/M/L/LL 或 9号/11号",
    defaultSizes: ["S", "M", "L", "LL"],
    sampleDefault: "M",
  },
];

export function getRegionOption(id: SizeRegionStandard) {
  return SIZE_REGION_OPTIONS.find((o) => o.id === id) ?? SIZE_REGION_OPTIONS[0];
}

export function regionStandardLabel(id?: SizeRegionStandard): string {
  if (!id) return "";
  return getRegionOption(id).label;
}
