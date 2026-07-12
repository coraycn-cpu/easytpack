import type { IntakeData, VisibleGarment } from "@/types/project";

export const SET_GARMENT_ID = "g_set";

export function isSetGarment(g: Pick<VisibleGarment, "id" | "kind" | "category">): boolean {
  return g.kind === "set" || g.id === SET_GARMENT_ID || /套装/.test(g.category ?? "");
}

/** 选款列表：≥2 单件且无套装项时，UI 兜底追加「整套」选项 */
export function buildGarmentPickerOptions(intake: IntakeData): VisibleGarment[] {
  const singles = (intake.visibleGarments ?? []).filter((g) => !isSetGarment(g));

  if (singles.length === 0) {
    if (intake.detectedCategory) {
      return [
        {
          id: "g1",
          label: intake.suggestedTitle ?? intake.detectedCategory,
          category: intake.detectedCategory,
        },
      ];
    }
    return [];
  }

  const existingSet = (intake.visibleGarments ?? []).find(isSetGarment);
  if (existingSet) {
    return [...singles, existingSet];
  }

  if (singles.length < 2) {
    return singles;
  }

  const suggested = intake.suggestedTitle?.trim() ?? "";
  const setLabel =
    suggested && /套装|整套|set/i.test(suggested)
      ? suggested
      : `${singles.map((g) => g.label).join(" + ")}（整套）`;

  const setOption: VisibleGarment = {
    id: SET_GARMENT_ID,
    label: setLabel,
    category: "套装",
    kind: "set",
    componentIds: singles.map((g) => g.id),
  };

  return [...singles, setOption];
}

export function garmentOptionSubtitle(
  g: VisibleGarment,
  allOptions: VisibleGarment[],
): string {
  if (isSetGarment(g)) {
    const parts = (g.componentIds ?? [])
      .map((id) => allOptions.find((o) => o.id === id))
      .filter(Boolean)
      .map((o) => o!.category || o!.label);
    if (parts.length > 0) {
      return `${parts.join(" + ")} · 同一 Tech Pack`;
    }
    return "上装 + 下装 · 同一 Tech Pack";
  }
  return g.category;
}
