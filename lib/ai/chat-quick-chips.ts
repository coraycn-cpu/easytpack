import { inferGarmentBodyZone } from "@/lib/ai/garment-scope";
import type { TechPackProject } from "@/types/project";

export type ChatQuickChip = { label: string; text: string };

const CHIP_FABRIC: ChatQuickChip = {
  label: "推荐面料",
  text: "这个款推荐什么面料？要注意什么？",
};
const CHIP_PROCESS: ChatQuickChip = {
  label: "工艺要点",
  text: "这个款工艺上要注意什么？",
};
const CHIP_ENHANCE: ChatQuickChip = {
  label: "补全缺失",
  text: "帮我看看工艺包还缺什么，并建议一键补全",
};
const CHIP_BOM: ChatQuickChip = {
  label: "按图填物料",
  text: "根据当前款式图补充面辅料清单",
};
const CHIP_ANNOTATE: ChatQuickChip = {
  label: "标工艺",
  text: "请在当前画板上标出主要工艺区域",
};

const CHIP_SLEEVE: ChatQuickChip = {
  label: "袖长建议",
  text: "这个袖子长度多少合适？怎么做？",
};
const CHIP_NECK: ChatQuickChip = {
  label: "领口做法",
  text: "这个领口怎么做比较合适？",
};
const CHIP_HEM_TOP: ChatQuickChip = {
  label: "下摆做法",
  text: "这个下摆怎么处理比较合适？",
};

const CHIP_WAIST: ChatQuickChip = {
  label: "腰头做法",
  text: "这个腰头/裤头怎么做比较合适？",
};
const CHIP_LENGTH_PANTS: ChatQuickChip = {
  label: "裤长建议",
  text: "这个裤长多少合适？怎么做？",
};
const CHIP_LENGTH_SKIRT: ChatQuickChip = {
  label: "裙长建议",
  text: "这个裙长多少合适？怎么做？",
};
const CHIP_POCKET: ChatQuickChip = {
  label: "口袋工艺",
  text: "这个口袋怎么做比较合适？",
};

const CHIP_SET_TOP: ChatQuickChip = {
  label: "上装要点",
  text: "这套上装的领口、袖子工艺要注意什么？",
};
const CHIP_SET_BOTTOM: ChatQuickChip = {
  label: "下装要点",
  text: "这套下装的腰头、裤长工艺要注意什么？",
};

function isSleeveless(blob: string): boolean {
  return /马甲|背心|吊带|抹胸|无袖|sleeveless/.test(blob);
}

function isSkirtLike(blob: string): boolean {
  return /半身裙|A字裙|裙子|skirt/.test(blob) && !/裙裤/.test(blob);
}

/**
 * 按目标款品类/身体区域生成快捷问题，避免给裤子推「袖长」等无关项。
 */
export function buildChatQuickChips(
  project: Pick<TechPackProject, "intake">,
): ChatQuickChip[] {
  const { intake } = project;
  const target = intake.targetGarment;
  const zone = inferGarmentBodyZone(
    target?.label,
    target?.category ?? intake.detectedCategory,
    target?.kind,
  );
  const features = (intake.detectedFeatures ?? []).join(" ");
  const blob = [
    target?.label,
    target?.category,
    intake.detectedCategory,
    features,
  ]
    .filter(Boolean)
    .join(" ");

  const hasSleeve = /袖|sleeve/.test(blob);
  const hasNeck = /领|neck/.test(blob);
  const hasWaist = /腰|裤头|腰头/.test(blob);
  const hasPocket = /袋|pocket/.test(blob);

  const partChips: ChatQuickChip[] = [];

  switch (zone) {
    case "bottom":
      partChips.push(
        isSkirtLike(blob) ? CHIP_LENGTH_SKIRT : CHIP_LENGTH_PANTS,
        CHIP_WAIST,
      );
      if (hasPocket) partChips.push(CHIP_POCKET);
      break;
    case "top":
      if (isSleeveless(blob) && !hasSleeve) partChips.push(CHIP_HEM_TOP);
      else partChips.push(CHIP_SLEEVE);
      partChips.push(CHIP_NECK);
      break;
    case "full":
      partChips.push(CHIP_NECK);
      if (!isSleeveless(blob) || hasSleeve) partChips.push(CHIP_SLEEVE);
      else partChips.push(CHIP_LENGTH_SKIRT);
      break;
    case "set":
      partChips.push(CHIP_SET_TOP, CHIP_SET_BOTTOM);
      break;
    default:
      if (hasNeck) partChips.push(CHIP_NECK);
      if (hasSleeve) partChips.push(CHIP_SLEEVE);
      if (hasWaist || /裤|裙/.test(blob)) {
        partChips.push(
          isSkirtLike(blob) ? CHIP_LENGTH_SKIRT : CHIP_LENGTH_PANTS,
        );
        partChips.push(CHIP_WAIST);
      }
      if (partChips.length === 0) partChips.push(CHIP_POCKET);
      break;
  }

  return [
    CHIP_FABRIC,
    CHIP_PROCESS,
    ...partChips.slice(0, 2),
    CHIP_ENHANCE,
    CHIP_BOM,
    CHIP_ANNOTATE,
  ];
}
