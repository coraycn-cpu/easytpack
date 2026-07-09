export type PanelPosition = { x: number; y: number; w: number; h?: number };

export type StudioLayout = {
  /** 款式图在无限画布上的锚点（仅 x/y，尺寸随内容扩展） */
  stage: PanelPosition;
  ai: PanelPosition;
  data: PanelPosition;
  viewport: { panX: number; panY: number; scale: number };
  /** @deprecated */
  tabs?: PanelPosition;
  toolbar?: PanelPosition;
  artboard?: PanelPosition;
};

/** 浮动面板默认在款式图右侧、首屏可见区域 */
export const STUDIO_PANEL_X = 1700;

export const DEFAULT_STUDIO_LAYOUT: StudioLayout = {
  stage: { x: 48, y: 48, w: 0, h: 0 },
  ai: { x: STUDIO_PANEL_X, y: 80, w: 340 },
  data: { x: STUDIO_PANEL_X, y: 420, w: 340, h: 420 },
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

  // 旧版布局：面板被放到画板下方，首屏看不到
  if (merged.ai.y > 800) {
    merged.ai = { ...merged.ai, x: base.ai.x, y: base.ai.y };
  }
  if (merged.data.y > 800) {
    merged.data = { ...merged.data, x: base.data.x, y: base.data.y };
  }

  return merged;
}

/** 固定工具栏挂载点 id */
export const STUDIO_TOOLBAR_ANCHOR_ID = "studio-toolbar-anchor";
