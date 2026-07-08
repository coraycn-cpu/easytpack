export type PanelPosition = { x: number; y: number; w: number; h?: number };

export type StudioLayout = {
  tabs: PanelPosition;
  toolbar: PanelPosition;
  stage: PanelPosition;
  ai: PanelPosition;
  data: PanelPosition;
  viewport: { panX: number; panY: number; scale: number };
  /** @deprecated 旧版整块画板 */
  artboard?: PanelPosition;
};

export const DEFAULT_STUDIO_LAYOUT: StudioLayout = {
  tabs: { x: 64, y: 48, w: 480 },
  toolbar: { x: 64, y: 88, w: 720 },
  stage: { x: 64, y: 148, w: 760, h: 520 },
  ai: { x: 860, y: 48, w: 340 },
  data: { x: 860, y: 380, w: 340, h: 420 },
  viewport: { panX: 0, panY: 0, scale: 1 },
};

export function getStudioLayout(saved?: StudioLayout): StudioLayout {
  const base = { ...DEFAULT_STUDIO_LAYOUT };
  if (!saved) return base;

  const merged: StudioLayout = {
    tabs: { ...base.tabs, ...saved.tabs },
    toolbar: { ...base.toolbar, ...saved.toolbar },
    stage: { ...base.stage, ...saved.stage },
    ai: { ...base.ai, ...saved.ai },
    data: { ...base.data, ...saved.data },
    viewport: { ...base.viewport, ...saved.viewport },
  };

  if (saved.artboard && !saved.stage) {
    merged.tabs = { x: saved.artboard.x, y: saved.artboard.y, w: 400 };
    merged.toolbar = { x: saved.artboard.x, y: saved.artboard.y + 40, w: saved.artboard.w };
    merged.stage = {
      x: saved.artboard.x,
      y: saved.artboard.y + 100,
      w: saved.artboard.w,
      h: (saved.artboard.h ?? 520) - 100,
    };
  }

  return merged;
}
