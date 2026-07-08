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
  stage: { x: 48, y: 48, w: 720, h: 560 },
  ai: { x: 48, y: 640, w: 340 },
  data: { x: 420, y: 640, w: 340, h: 420 },
  viewport: { panX: 0, panY: 0, scale: 1 },
};

export function getStudioLayout(saved?: StudioLayout): StudioLayout {
  const base = { ...DEFAULT_STUDIO_LAYOUT };
  if (!saved) return base;

  const merged: StudioLayout = {
    stage: { ...base.stage, ...saved.stage },
    ai: { ...base.ai, ...saved.ai },
    data: { ...base.data, ...saved.data },
    viewport: { ...base.viewport, ...saved.viewport },
  };

  // 旧版布局：AI/数据面板在款式图右侧，容易遮挡款式图
  if (merged.ai.x > 600) {
    merged.ai = { ...base.ai, ...saved.ai, x: base.ai.x, y: base.ai.y };
  }
  if (merged.data.x > 600) {
    merged.data = { ...base.data, ...saved.data, x: base.data.x, y: base.data.y };
  }

  return merged;
}

/** 固定工具栏挂载点 id */
export const STUDIO_TOOLBAR_ANCHOR_ID = "studio-toolbar-anchor";
