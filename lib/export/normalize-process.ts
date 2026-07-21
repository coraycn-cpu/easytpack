import type { ProcessItem } from "@/types/process";

/** 针法列应短；超长多半是工艺描述误写入 stitch */
const STITCH_MAX_REASONABLE = 24;

/**
 * 导出/预览前纠正工艺字段错位，避免结构工艺表「部位空、针法塞长文」并挤掉其它行。
 * 不改项目存储，仅用于展示与 Excel/PDF 同源数据。
 */
export function normalizeProcessItemsForExport(
  items: ProcessItem[],
): ProcessItem[] {
  return items.map((item) => {
    const part = item.part?.trim() ?? "";
    let process = item.process?.trim() ?? "";
    let stitch = item.stitch?.trim() ?? "";
    const seam = item.seam_allowance?.trim() ?? "";

    const stitchTooLong = stitch.length > STITCH_MAX_REASONABLE;
    const processEmpty = !process;
    const processShort = process.length > 0 && process.length <= STITCH_MAX_REASONABLE;

    // 长文在 stitch、工艺为空 → 挪到工艺
    if (stitchTooLong && processEmpty) {
      process = stitch;
      stitch = "";
    }
    // 长文在 stitch、工艺很短（像针法）→ 对调
    else if (stitchTooLong && processShort && process.length < stitch.length) {
      const tmp = process;
      process = stitch;
      stitch = tmp;
    }

    return {
      ...item,
      part,
      process,
      stitch: stitch || undefined,
      seam_allowance: seam || undefined,
    };
  });
}
