export type PanelPosition = { x: number; y: number; w: number; h?: number };

export type StudioLayout = {
  artboard: PanelPosition;
  ai: PanelPosition;
  data: PanelPosition;
  viewport: { panX: number; panY: number; scale: number };
};

export const DEFAULT_STUDIO_LAYOUT: StudioLayout = {
  artboard: { x: 48, y: 48, w: 820, h: 620 },
  ai: { x: 900, y: 48, w: 340 },
  data: { x: 900, y: 380, w: 340, h: 420 },
  viewport: { panX: 0, panY: 0, scale: 1 },
};

export function getStudioLayout(saved?: StudioLayout): StudioLayout {
  if (!saved) return { ...DEFAULT_STUDIO_LAYOUT };
  return {
    artboard: { ...DEFAULT_STUDIO_LAYOUT.artboard, ...saved.artboard },
    ai: { ...DEFAULT_STUDIO_LAYOUT.ai, ...saved.ai },
    data: { ...DEFAULT_STUDIO_LAYOUT.data, ...saved.data },
    viewport: { ...DEFAULT_STUDIO_LAYOUT.viewport, ...saved.viewport },
  };
}
