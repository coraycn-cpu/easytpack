export type PanelPosition = { x: number; y: number; w: number; h?: number };

export type StudioLayout = {
  /** 款式图在无限画布上的位置（无外层容器） */
  stage: PanelPosition;
  ai: PanelPosition;
  data: PanelPosition;
  viewport: { panX: number; panY: number; scale: number };
  /** @deprecated */
  tabs?: PanelPosition;
  toolbar?: PanelPosition;
  artboard?: PanelPosition;
};

export const DEFAULT_STUDIO_LAYOUT: StudioLayout = {
  stage: { x: 120, y: 80, w: 800, h: 560 },
  ai: { x: 960, y: 48, w: 340 },
  data: { x: 960, y: 380, w: 340, h: 420 },
  viewport: { panX: 0, panY: 0, scale: 1 },
};

export function getStudioLayout(saved?: StudioLayout): StudioLayout {
  const base = { ...DEFAULT_STUDIO_LAYOUT };
  if (!saved) return base;

  return {
    stage: { ...base.stage, ...saved.stage },
    ai: { ...base.ai, ...saved.ai },
    data: { ...base.data, ...saved.data },
    viewport: { ...base.viewport, ...saved.viewport },
  };
}

/** 固定工具栏挂载点 id */
export const STUDIO_TOOLBAR_ANCHOR_ID = "studio-toolbar-anchor";
