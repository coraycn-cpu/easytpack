"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Circle,
  Arrow,
  Line,
  Text,
  Group,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import {
  MANUAL_ANNOTATION_COLOR,
} from "@/lib/canvas/annotation-colors";
import {
  DEFAULT_LAYER_VISIBILITY,
  filterAnnotationsByLayers,
  isLayerVisible,
  type LayerVisibility,
} from "@/lib/canvas/annotation-layers";
import { isDimensionAnnotation } from "@/lib/canvas/size-annotations";
import {
  computeStudioStageBounds,
  computeMultiStudioStageBounds,
  computeImagePlacement,
  annotationToLocalCoords,
} from "@/lib/canvas/bounds";
import { computeImageFit } from "@/lib/canvas/fit";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";
import { isLinkableShape } from "@/lib/canvas/part-annotations";
import { computeSequenceBadges } from "@/lib/canvas/sequence-badges";
import type { ProcessItem } from "@/types/process";
import type { Annotation, Artboard } from "@/types/project";
import CanvasToolbar, { DEFAULT_ANNOTATION_COLOR } from "./CanvasToolbar";
import type { CanvasTool } from "@/types/canvas";
import DraggablePanel from "@/components/studio/DraggablePanel";
import type { PanelPosition } from "@/lib/studio/layout";
import { STUDIO_TOOLBAR_ANCHOR_ID } from "@/lib/studio/layout";
import ViewRegenerateOverlays from "@/components/canvas/ViewRegenerateOverlays";

type Snapshot = { annotations: Annotation[] };

type AnnotationCanvasProps = {
  imageUrl?: string | null;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  showImport?: boolean;
  onImageChange?: (dataUrl: string) => void;
  className?: string;
  embedded?: boolean;
  stageHeight?: number;
  imageOffset?: { x: number; y: number };
  onImageOffsetChange?: (offset: { x: number; y: number }) => void;
  splitOnCanvas?: boolean;
  splitLayout?: { tabs: PanelPosition; toolbar: PanelPosition; stage: PanelPosition };
  onSplitLayoutChange?: (
    key: "tabs" | "toolbar" | "stage",
    patch: Partial<PanelPosition>,
  ) => void;
  canvasScale?: number;
  tabsContent?: React.ReactNode;
  /** 工具栏固定顶部 + 款式图直接铺在无限画布上 */
  fixedChrome?: boolean;
  stagePosition?: PanelPosition;
  onStagePositionChange?: (patch: Partial<PanelPosition>) => void;
  /** AI 标工艺（batch 标注 + 工艺 tab） */
  onAnnotateProcess?: () => void;
  annotateProcessLoading?: boolean;
  onRegionAiFill?: () => void;
  onDimensionAiFill?: () => void;
  dimensionAiLoading?: boolean;
  layerVisibility?: LayerVisibility;
  onLayerVisibilityChange?: (layers: LayerVisibility) => void;
  toolbarMessage?: string | null;
  /** 多画板并排模式 */
  multiArtboards?: Artboard[];
  artboardSlots?: ArtboardSlot[];
  activeArtboardId?: string;
  onActiveArtboardChange?: (id: string) => void;
  /** 主款画板 ID，不可删除 */
  primaryArtboardId?: string;
  onDeleteArtboard?: (artboardId: string) => void;
  /** AI 生成图：修正提示词后重新生成 */
  onRegenerateView?: (artboardId: string, correctionPrompt: string) => void;
  regeneratingArtboardId?: string | null;
  viewportScale?: number;
  onViewportScaleChange?: (scale: number) => void;
  onResetViewport?: () => void;
  onFullCollect?: () => void;
  onFillBom?: () => void;
  onFillSize?: () => void;
  onEnhanceAll?: () => void;
  onExplain?: () => void;
  aiLoading?: boolean;
  interactionLocked?: boolean;
  viewport?: { panX: number; panY: number; scale: number };
  onViewportChange?: (viewport: { panX: number; panY: number; scale: number }) => void;
  processItems?: ProcessItem[];
  selectedAnnId?: string | null;
  onSelectedAnnIdChange?: (id: string | null) => void;
  linkedHighlightAnnIds?: string[];
};

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const DRAW_TOOLS: CanvasTool[] = [
  "rect",
  "circle",
  "arrow",
  "text",
  "dimension",
  "freehand",
];

export default function AnnotationCanvas({
  imageUrl,
  annotations,
  onAnnotationsChange,
  showImport = false,
  onImageChange,
  className = "",
  embedded = false,
  stageHeight = 480,
  imageOffset = { x: 0, y: 0 },
  onImageOffsetChange,
  splitOnCanvas = false,
  splitLayout,
  onSplitLayoutChange,
  canvasScale = 1,
  tabsContent,
  fixedChrome = false,
  stagePosition,
  onStagePositionChange,
  onAnnotateProcess,
  annotateProcessLoading,
  onRegionAiFill,
  onDimensionAiFill,
  dimensionAiLoading,
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  onLayerVisibilityChange,
  toolbarMessage,
  multiArtboards,
  artboardSlots,
  activeArtboardId,
  onActiveArtboardChange,
  primaryArtboardId,
  onDeleteArtboard,
  onRegenerateView,
  regeneratingArtboardId,
  viewportScale,
  onViewportScaleChange,
  onResetViewport,
  onFullCollect,
  onFillBom,
  onFillSize,
  onEnhanceAll,
  onExplain,
  aiLoading,
  interactionLocked,
  viewport,
  onViewportChange,
  processItems,
  selectedAnnId: controlledSelectedAnnId,
  onSelectedAnnIdChange,
  linkedHighlightAnnIds = [],
}: AnnotationCanvasProps) {
  const multiMode = Boolean(multiArtboards?.length && artboardSlots?.length);
  const activeSlot = multiMode
    ? artboardSlots!.find((s) => s.id === activeArtboardId)
    : undefined;
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageFit, setImageFit] = useState({ x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });
  const [artboardImages, setArtboardImages] = useState<
    Map<string, { img: HTMLImageElement; fit: ReturnType<typeof computeImagePlacement> }>
  >(new Map());
  const [tool, setTool] = useState<CanvasTool>("select");
  const [color, setColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [zoom, setZoom] = useState(1);
  const [internalSelectedAnnId, setInternalSelectedAnnId] = useState<string | null>(null);
  const isSelectionControlled = controlledSelectedAnnId !== undefined;
  const selectedAnnId = isSelectionControlled
    ? (controlledSelectedAnnId ?? null)
    : internalSelectedAnnId;
  const setSelectedAnnId = useCallback(
    (id: string | null) => {
      if (isSelectionControlled) onSelectedAnnIdChange?.(id);
      else setInternalSelectedAnnId(id);
    },
    [isSelectionControlled, onSelectedAnnIdChange],
  );
  const [imageSelected, setImageSelected] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isPanning) return;
    const onUp = () => setIsPanning(false);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [isPanning]);

  const panelStageH = splitOnCanvas
    ? Math.max(320, (splitLayout?.stage.h ?? 520) - 32)
    : stageHeight;
  const [containerSize, setContainerSize] = useState({ w: CANVAS_W, h: panelStageH });

  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [draftLine, setDraftLine] = useState<{
    x: number;
    y: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const draftRectRef = useRef(draftRect);
  const draftLineRef = useRef(draftLine);
  const freehandRef = useRef(freehandPoints);
  const isDrawingRef = useRef(isDrawing);
  const toolRef = useRef(tool);
  const annotationsRef = useRef(annotations);
  /** 当前款式图在画板内的锚点，标注拖拽时需还原为绝对坐标 */
  const imageCoordOriginRef = useRef({ x: 0, y: 0 });
  draftRectRef.current = draftRect;
  draftLineRef.current = draftLine;
  freehandRef.current = freehandPoints;
  isDrawingRef.current = isDrawing;
  toolRef.current = tool;
  annotationsRef.current = annotations;

  const clearDrafts = useCallback(() => {
    draftRectRef.current = null;
    setDraftRect(null);
    draftLineRef.current = null;
    setDraftLine(null);
  }, []);

  const ensureProcessLayerVisible = useCallback(() => {
    if (!layerVisibility || !onLayerVisibilityChange) return;
    if (!layerVisibility.process) {
      onLayerVisibilityChange({ ...layerVisibility, process: true });
    }
  }, [layerVisibility, onLayerVisibilityChange]);

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const normalizedAnnotations = normalizeAnnotations(annotations);
  const visibleAnnotations = useMemo(
    () => filterAnnotationsByLayers(normalizedAnnotations, layerVisibility),
    [normalizedAnnotations, layerVisibility],
  );

  const syncHistoryButtons = () => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  };

  const loadImage = useCallback(
    (url: string) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
        setImageFit(
          fixedChrome
            ? computeImagePlacement(img.naturalWidth, img.naturalHeight)
            : computeImageFit(img.naturalWidth, img.naturalHeight),
        );
      };
      img.src = url;
    },
    [fixedChrome],
  );

  useEffect(() => {
    if (multiMode) return;
    if (imageUrl) loadImage(imageUrl);
    else setImage(null);
  }, [imageUrl, loadImage, multiMode]);

  useEffect(() => {
    if (!multiMode || !multiArtboards) return;
    let cancelled = false;
    const next = new Map<
      string,
      { img: HTMLImageElement; fit: ReturnType<typeof computeImagePlacement> }
    >();

    const loadAll = async () => {
      for (const ab of multiArtboards) {
        if (!ab.imageDataUrl) continue;
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (cancelled) return;
            next.set(ab.id, {
              img,
              fit: computeImagePlacement(img.naturalWidth, img.naturalHeight),
            });
            resolve();
          };
          img.onerror = () => resolve();
          img.src = ab.imageDataUrl!;
        });
      }
      if (!cancelled) setArtboardImages(new Map(next));
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [multiMode, multiArtboards]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pushHistory = useCallback(() => {
    undoStack.current.push({
      annotations: structuredClone(annotations),
    });
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
    syncHistoryButtons();
  }, [annotations]);

  const applySnapshot = (snap: Snapshot) => {
    onAnnotationsChange(snap.annotations);
    setSelectedAnnId(null);
  };

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({
      annotations: structuredClone(annotations),
    });
    applySnapshot(prev);
    syncHistoryButtons();
  }, [annotations, onAnnotationsChange]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({
      annotations: structuredClone(annotations),
    });
    applySnapshot(next);
    syncHistoryButtons();
  }, [annotations, onAnnotationsChange]);

  const commitAnnotations = (next: Annotation[]) => {
    pushHistory();
    onAnnotationsChange(next);
  };

  const studioBounds = fixedChrome
    ? multiMode && artboardSlots && multiArtboards
      ? computeMultiStudioStageBounds({
          slots: artboardSlots,
          artboards: multiArtboards,
        })
      : computeStudioStageBounds({
          imageFit: image ? imageFit : null,
          imageOffset,
          annotations: normalizedAnnotations,
        })
    : null;

  const logicalW = fixedChrome ? studioBounds!.width : CANVAS_W;
  const logicalH = fixedChrome
    ? studioBounds!.height
    : embedded || splitOnCanvas
      ? panelStageH
      : CANVAS_H;
  const contentOffsetX = fixedChrome ? studioBounds!.offsetX : 0;
  const contentOffsetY = fixedChrome ? studioBounds!.offsetY : 0;
  const transparentStage = fixedChrome || splitOnCanvas;
  const baseFit = fixedChrome
    ? 1
    : Math.min(
        containerSize.w / CANVAS_W,
        containerSize.h / (embedded || splitOnCanvas ? panelStageH : CANVAS_H),
      );
  const fitScale = baseFit * (fixedChrome ? 1 : zoom);
  const stageW = logicalW * fitScale;
  const stageH = logicalH * fitScale;

  const getPointer = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return null;
    let x = pos.x - contentOffsetX;
    let y = pos.y - contentOffsetY;
    if (multiMode && activeSlot) {
      x -= activeSlot.origin.x;
      y -= activeSlot.origin.y;
    }
    return { x, y };
  };

  const activeImageEntry = multiMode && activeArtboardId
    ? artboardImages.get(activeArtboardId)
    : null;
  const displayImage = multiMode ? activeImageEntry?.img ?? null : image;

  const isPanActive = tool === "pan" || spaceDown;
  const isDrawingMode = tool !== "select" && tool !== "pan";

  const handlePanStart = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!viewport || !onViewportChange) return;
    if ("button" in e.evt && e.evt.button !== 0) return;
    e.cancelBubble = true;
    const clientX = "clientX" in e.evt ? e.evt.clientX : e.evt.touches[0]?.clientX ?? 0;
    const clientY = "clientY" in e.evt ? e.evt.clientY : e.evt.touches[0]?.clientY ?? 0;
    panStart.current = {
      clientX,
      clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    };
    setIsPanning(true);
  };

  const handlePanMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isPanning || !viewport || !onViewportChange) return;
    const clientX = "clientX" in e.evt ? e.evt.clientX : e.evt.touches[0]?.clientX ?? 0;
    const clientY = "clientY" in e.evt ? e.evt.clientY : e.evt.touches[0]?.clientY ?? 0;
    onViewportChange({
      ...viewport,
      panX: panStart.current.panX + (clientX - panStart.current.clientX),
      panY: panStart.current.panY + (clientY - panStart.current.clientY),
    });
  };

  const handlePanEnd = () => setIsPanning(false);

  const selectAnnotation = (id: string) => {
    setSelectedAnnId(id);
    setImageSelected(false);
  };

  const selectImage = () => {
    setImageSelected(true);
    setSelectedAnnId(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  };

  const handleAnnClick = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    id: string,
  ) => {
    e.cancelBubble = true;
    selectAnnotation(id);
    if (tool !== "select") setTool("select");
  };

  const isEmptyTarget = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const t = e.target;
    const stage = t.getStage();
    const name = typeof t.name === "function" ? t.name() : "";
    return t === stage || t.getType() === "Layer" || name === "stage-hit";
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!displayImage || isPanActive) return;
    const currentTool = toolRef.current;

    // 选择工具：点空白取消选中；点图片由图片自身处理
    if (currentTool === "select") {
      if (isEmptyTarget(e)) {
        setSelectedAnnId(null);
        setImageSelected(false);
      }
      return;
    }

    const pos = getPointer(e);
    if (!pos) return;

    e.cancelBubble = true;
    setImageSelected(false);

    if (currentTool === "rect" || currentTool === "circle") {
      ensureProcessLayerVisible();
      const next = { x: pos.x, y: pos.y, width: 0, height: 0 };
      draftRectRef.current = next;
      setDraftRect(next);
      return;
    }

    if (currentTool === "arrow" || currentTool === "dimension") {
      const next = { x: pos.x, y: pos.y, x2: pos.x, y2: pos.y };
      draftLineRef.current = next;
      setDraftLine(next);
      return;
    }

    if (currentTool === "text") {
      const text = window.prompt("输入标注文字", "");
      if (text?.trim()) {
        commitAnnotations([
          ...annotations,
          {
            id: createId("ann"),
            type: "text",
            color,
            x: pos.x,
            y: pos.y,
            text: text.trim(),
            strokeWidth: 3,
          },
        ]);
        setTool("select");
      }
      return;
    }

    if (currentTool === "freehand") {
      isDrawingRef.current = true;
      setIsDrawing(true);
      freehandRef.current = [pos.x, pos.y];
      setFreehandPoints([pos.x, pos.y]);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getPointer(e);
    if (!pos) return;
    const currentTool = toolRef.current;

    const rect = draftRectRef.current;
    if (rect) {
      const next = {
        ...rect,
        width: pos.x - rect.x,
        height: pos.y - rect.y,
      };
      draftRectRef.current = next;
      setDraftRect(next);
    }
    const line = draftLineRef.current;
    if (line) {
      const next = { ...line, x2: pos.x, y2: pos.y };
      draftLineRef.current = next;
      setDraftLine(next);
    }
    if (isDrawingRef.current && currentTool === "freehand") {
      const pts = [...freehandRef.current, pos.x, pos.y];
      freehandRef.current = pts;
      setFreehandPoints(pts);
    }
  };

  const finishDrawing = useCallback(() => {
    const currentTool = toolRef.current;
    const rect = draftRectRef.current;
    const line = draftLineRef.current;
    const points = freehandRef.current;

    if (rect && (currentTool === "rect" || currentTool === "circle")) {
      const n = {
        x: rect.width < 0 ? rect.x + rect.width : rect.x,
        y: rect.height < 0 ? rect.y + rect.height : rect.y,
        width: Math.abs(rect.width),
        height: Math.abs(rect.height),
      };
      if (n.width > 8 && n.height > 8) {
        const id = createId("ann");
        const currentAnnotations = annotationsRef.current;
        commitAnnotations([
          ...currentAnnotations,
          {
            id,
            type: currentTool,
            color: MANUAL_ANNOTATION_COLOR,
            ...n,
            strokeWidth: 3,
          },
        ]);
        selectAnnotation(id);
        setTool("select");
      }
      draftRectRef.current = null;
      setDraftRect(null);
    }

    if (line && (currentTool === "arrow" || currentTool === "dimension")) {
      const { x, y, x2, y2 } = line;
      if (Math.hypot(x2 - x, y2 - y) > 12) {
        let text: string | undefined;
        if (currentTool === "dimension") {
          text = window.prompt("尺寸数值（如 52cm）", "") ?? undefined;
        }
        const id = createId("ann");
        const currentAnnotations = annotationsRef.current;
        commitAnnotations([
          ...currentAnnotations,
          {
            id,
            type: currentTool,
            color: currentTool === "dimension" ? MANUAL_ANNOTATION_COLOR : color,
            x,
            y,
            x2,
            y2,
            text: text?.trim() || undefined,
            strokeWidth: 3,
          },
        ]);
        selectAnnotation(id);
        setTool("select");
      }
      draftLineRef.current = null;
      setDraftLine(null);
    }

    if (isDrawingRef.current && currentTool === "freehand" && points.length > 4) {
      const id = createId("ann");
      commitAnnotations([
        ...annotationsRef.current,
        {
          id,
          type: "freehand",
          color,
          x: 0,
          y: 0,
          points: [...points],
          strokeWidth: 3,
        },
      ]);
      selectAnnotation(id);
      setTool("select");
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
    freehandRef.current = [];
    setFreehandPoints([]);
  }, [color, commitAnnotations, selectAnnotation]);

  useEffect(() => {
    if (tool === "select" || tool === "pan") return;
    const onUp = () => finishDrawing();
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [tool, finishDrawing]);

  const deleteSelected = useCallback(() => {
    if (selectedAnnId) {
      pushHistory();
      onAnnotationsChange(annotations.filter((a) => a.id !== selectedAnnId));
      setSelectedAnnId(null);
      syncHistoryButtons();
      return true;
    }
    return false;
  }, [selectedAnnId, annotations, pushHistory, onAnnotationsChange, setSelectedAnnId]);

  const tryDeleteActiveArtboard = useCallback(() => {
    if (
      !onDeleteArtboard ||
      !activeArtboardId ||
      !primaryArtboardId ||
      activeArtboardId === primaryArtboardId ||
      tool !== "select" ||
      selectedAnnId
    ) {
      return false;
    }
    const ab = multiArtboards?.find((a) => a.id === activeArtboardId);
    if (!ab) return false;
    if (!window.confirm(`删除「${ab.name}」？此操作不可撤销。`)) return true;
    onDeleteArtboard(activeArtboardId);
    return true;
  }, [
    onDeleteArtboard,
    activeArtboardId,
    primaryArtboardId,
    tool,
    selectedAnnId,
    multiArtboards,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (!deleteSelected()) {
          tryDeleteActiveArtboard();
        }
      }
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, tryDeleteActiveArtboard, undo, redo]);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedAnnId) {
      const ann = normalizedAnnotations.find((a) => a.id === selectedAnnId);
      if (ann && !isLayerVisible(ann, layerVisibility)) {
        tr.nodes([]);
        tr.getLayer()?.batchDraw();
        return;
      }
      const node = stage.findOne(`#ann_${selectedAnnId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedAnnId, annotations, layerVisibility, normalizedAnnotations]);

  useEffect(() => {
    if (!selectedAnnId) return;
    const ann = normalizedAnnotations.find((a) => a.id === selectedAnnId);
    if (ann && !isLayerVisible(ann, layerVisibility)) {
      setSelectedAnnId(null);
    }
  }, [layerVisibility, selectedAnnId, normalizedAnnotations, setSelectedAnnId]);

  const updateAnnotation = (id: string, patch: Partial<Annotation>) => {
    onAnnotationsChange(
      annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  };

  const handleAnnDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    pushHistory();
    const node = e.target;
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    const ox = imageCoordOriginRef.current.x;
    const oy = imageCoordOriginRef.current.y;

    if (ann.type === "marker") {
      updateAnnotation(id, { x: node.x() + ox, y: node.y() + oy });
    } else if (ann.type === "rect" || ann.type === "circle") {
      updateAnnotation(id, {
        x: node.x() + ox,
        y: node.y() + oy,
        color: MANUAL_ANNOTATION_COLOR,
      });
    } else if (ann.type === "text") {
      updateAnnotation(id, { x: node.x() + ox, y: node.y() + oy });
    } else if (ann.type === "arrow" || ann.type === "dimension") {
      const baseX = ann.x ?? 0;
      const baseY = ann.y ?? 0;
      const dx = (ann.x2 ?? baseX) - baseX;
      const dy = (ann.y2 ?? baseY) - baseY;
      const newX = node.x() + ox;
      const newY = node.y() + oy;
      updateAnnotation(id, {
        x: newX,
        y: newY,
        x2: newX + dx,
        y2: newY + dy,
        ...(ann.type === "dimension" ? { color: MANUAL_ANNOTATION_COLOR } : {}),
      });
    }
  };

  const handleLineTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    pushHistory();
    const node = e.target;
    const ann = annotations.find((a) => a.id === id);
    if (!ann || (ann.type !== "arrow" && ann.type !== "dimension")) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const baseX = ann.x ?? 0;
    const baseY = ann.y ?? 0;
    const dx = (ann.x2 ?? baseX) - baseX;
    const dy = (ann.y2 ?? baseY) - baseY;
    const ox = imageCoordOriginRef.current.x;
    const oy = imageCoordOriginRef.current.y;

    updateAnnotation(id, {
      x: node.x() + ox,
      y: node.y() + oy,
      x2: node.x() + ox + dx * scaleX,
      y2: node.y() + oy + dy * scaleY,
      ...(ann.type === "dimension" ? { color: MANUAL_ANNOTATION_COLOR } : {}),
    });
  };

  const handleAnnTransformEnd = (id: string, e: Konva.KonvaEventObject<Event>) => {
    pushHistory();
    const node = e.target;
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const ox = imageCoordOriginRef.current.x;
    const oy = imageCoordOriginRef.current.y;

    if (ann.type === "rect") {
      updateAnnotation(id, {
        x: node.x() + ox,
        y: node.y() + oy,
        width: Math.max(8, (ann.width ?? 0) * scaleX),
        height: Math.max(8, (ann.height ?? 0) * scaleY),
        color: MANUAL_ANNOTATION_COLOR,
      });
    } else if (ann.type === "circle") {
      updateAnnotation(id, {
        x: node.x() + ox,
        y: node.y() + oy,
        width: Math.max(8, (ann.width ?? 0) * scaleX),
        height: Math.max(8, (ann.height ?? 0) * scaleY),
        color: MANUAL_ANNOTATION_COLOR,
      });
    }
  };

  const renderAnnotation = (
    ann: Annotation,
    interactive = true,
    layerVisible = true,
    coordOrigin?: { x: number; y: number },
  ) => {
    const displayAnn = coordOrigin ? annotationToLocalCoords(ann, coordOrigin) : ann;
    const c = displayAnn.color ?? DEFAULT_ANNOTATION_COLOR;
    const sw = displayAnn.strokeWidth ?? 3;
    const isSelected = selectedAnnId === ann.id;
    const isLinkedHighlight = linkedHighlightAnnIds.includes(ann.id);
    const hasProcessLink = (ann.linkedProcessIds?.length ?? 0) > 0;
    const canInteract = interactive && layerVisible;
    const draggable = tool === "select" && canInteract && !isPanActive;
    const listening = canInteract && !isPanActive && (tool === "select" || !isDrawingMode);

    switch (ann.type) {
      case "rect": {
        const partLabel = (ann.linkedProcessIds ?? [])
          .map((pid) => processItems?.find((p) => p.id === pid)?.part)
          .filter(Boolean)
          .join(" · ");
        return (
          <Group key={ann.id} visible={layerVisible}>
            <Rect
              id={`ann_${ann.id}`}
              x={displayAnn.x}
              y={displayAnn.y}
              width={displayAnn.width ?? 0}
              height={displayAnn.height ?? 0}
              stroke={isSelected ? "#2563eb" : isLinkedHighlight ? "#f59e0b" : c}
              strokeWidth={isSelected || isLinkedHighlight ? sw + 2 : sw}
              dash={hasProcessLink ? [6, 3] : undefined}
              fill={`${c}22`}
              listening={listening}
              draggable={draggable}
              onClick={(e) => handleAnnClick(e, ann.id)}
              onTap={(e) => handleAnnClick(e, ann.id)}
              onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
              onTransformEnd={(e) => handleAnnTransformEnd(ann.id, e)}
            />
            {partLabel && (
              <Text
                x={displayAnn.x + 4}
                y={displayAnn.y > 16 ? displayAnn.y - 6 : displayAnn.y + 16}
                text={partLabel}
                fontSize={13}
                fontStyle="600"
                fill={hasProcessLink ? "#1d4ed8" : c}
                listening={false}
              />
            )}
          </Group>
        );
      }
      case "circle":
        return (
          <Rect
            key={ann.id}
            id={`ann_${ann.id}`}
            visible={layerVisible}
            x={displayAnn.x}
            y={displayAnn.y}
            width={displayAnn.width ?? 0}
            height={displayAnn.height ?? 0}
            cornerRadius={9999}
            stroke={isSelected ? "#2563eb" : isLinkedHighlight ? "#f59e0b" : c}
            strokeWidth={isSelected || isLinkedHighlight ? sw + 2 : sw}
            fill={`${c}22`}
            listening={listening}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
            onTransformEnd={(e) => handleAnnTransformEnd(ann.id, e)}
          />
        );
      case "arrow":
      case "dimension": {
        const x1 = displayAnn.x;
        const y1 = displayAnn.y;
        const x2 = displayAnn.x2 ?? displayAnn.x;
        const y2 = displayAnn.y2 ?? displayAnn.y;
        const rdx = x2 - x1;
        const rdy = y2 - y1;
        return (
          <Group
            key={ann.id}
            id={`ann_${ann.id}`}
            x={x1}
            y={y1}
            visible={layerVisible}
            listening={listening}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
            onTransformEnd={(e) => handleLineTransformEnd(ann.id, e)}
          >
            <Arrow
              points={[0, 0, rdx, rdy]}
              stroke={c}
              fill={c}
              strokeWidth={isSelected ? sw + 1 : sw}
              pointerLength={10}
              pointerWidth={10}
              dash={ann.type === "dimension" ? [8, 4] : undefined}
              hitStrokeWidth={16}
            />
            {ann.text && (
              <Text
                x={rdx + 6}
                y={rdy - 8}
                text={
                  ann.type === "dimension" && ann.linkedSizePart
                    ? `${ann.linkedSizePart}${ann.text ? ` ${ann.text}` : ""}`
                    : ann.text
                }
                fontSize={14}
                fill={c}
                fontStyle="bold"
                listening={false}
              />
            )}
          </Group>
        );
      }
      case "text":
        return (
          <Text
            key={ann.id}
            id={`ann_${ann.id}`}
            visible={layerVisible}
            x={displayAnn.x}
            y={displayAnn.y}
            text={displayAnn.text ?? ""}
            fontSize={16}
            fill={c}
            fontStyle="bold"
            padding={4}
            listening={listening}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
          />
        );
      case "marker":
        return null;
      case "freehand":
        return (
          <Line
            key={ann.id}
            id={`ann_${ann.id}`}
            visible={layerVisible}
            points={displayAnn.points ?? []}
            stroke={c}
            strokeWidth={isSelected ? sw + 1 : sw}
            lineCap="round"
            lineJoin="round"
            tension={0.4}
            hitStrokeWidth={16}
            listening={listening}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
          />
        );
      default:
        return null;
    }
  };

  const sequenceBadges = useMemo(
    () =>
      layerVisibility.process
        ? computeSequenceBadges(processItems ?? [], visibleAnnotations)
        : [],
    [processItems, visibleAnnotations, layerVisibility.process],
  );

  const selectedLinkable =
    selectedAnnId &&
    visibleAnnotations.some(
      (a) => a.id === selectedAnnId && isLinkableShape(a.type),
    );

  const selectedAnn = selectedAnnId
    ? normalizedAnnotations.find((a) => a.id === selectedAnnId)
    : undefined;
  const selectedHasProcessLink = (selectedAnn?.linkedProcessIds?.length ?? 0) > 0;
  const selectedDimension =
    selectedAnnId &&
    selectedAnn &&
    isDimensionAnnotation(selectedAnn);
  const selectedHasSizeLink = Boolean(selectedAnn?.linkedSizePart?.trim());

  const toolbarHint =
    tool === "pan"
      ? "抓手工具 — 拖动画布视口，不移动款式图"
      : spaceDown
        ? "按住空格 — 拖动画布视口"
        : tool !== "select"
          ? tool === "rect" || tool === "circle"
            ? !layerVisibility.process
              ? "工艺层已关闭 — 正在自动开启；拖拽框选区域"
              : "拖拽框选工艺区域，松开后自动切回选择"
            : "绘制完成后自动切回选择"
          : imageSelected
            ? "款式图已选中 — 可拖动位置"
            : selectedLinkable && !selectedHasProcessLink
              ? "已框选区域 — 点「AI 识别工艺」或右侧面板手动关联"
              : selectedDimension && !selectedHasSizeLink
                ? "已选尺寸线 — 点「AI 识别尺寸」或右侧面板手动关联"
                : selectedAnnId
                ? "已选中 — Delete 删除 · Ctrl+Z 撤销"
                : "点击款式图或标注进行选中";

  const toolbarEl = (
    <CanvasToolbar
      tool={tool}
      onToolChange={(t) => {
        clearDrafts();
        setTool(t);
        if (t !== "select") {
          setImageSelected(false);
          setSelectedAnnId(null);
        }
        if (t === "rect" || t === "circle") {
          ensureProcessLayerVisible();
        }
      }}
      color={color}
      onColorChange={setColor}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      onDelete={deleteSelected}
      canDelete={Boolean(selectedAnnId)}
      zoom={fixedChrome ? 1 : zoom}
      onZoomChange={fixedChrome ? undefined : setZoom}
      viewportScale={viewportScale}
      onViewportScaleChange={onViewportScaleChange}
      onResetViewport={onResetViewport}
      flat
      theme={fixedChrome || splitOnCanvas ? "light" : "dark"}
      hint={toolbarMessage ?? toolbarHint}
      onFullCollect={onFullCollect}
      onAnnotateProcess={onAnnotateProcess}
      annotateProcessLoading={annotateProcessLoading}
      aiLoading={aiLoading}
      onFillBom={onFillBom}
      onFillSize={onFillSize}
      onEnhanceAll={onEnhanceAll}
      onExplain={onExplain}
      interactionLocked={interactionLocked}
      layerVisibility={layerVisibility}
      onLayerVisibilityChange={onLayerVisibilityChange}
    />
  );

  const [toolbarAnchor, setToolbarAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (fixedChrome) {
      setToolbarAnchor(document.getElementById(STUDIO_TOOLBAR_ANCHOR_ID));
    }
  }, [fixedChrome]);

  const stageEl = (
    <div
      ref={containerRef}
      className={`relative flex min-h-0 overflow-visible ${
        interactionLocked ? "pointer-events-none select-none opacity-95" : ""
      } ${
        transparentStage
          ? "bg-transparent"
          : embedded
            ? "bg-[#141414]"
            : "flex-1 items-center justify-center bg-[#141414]"
      }`}
      style={
        embedded || splitOnCanvas || fixedChrome
          ? {
              height: fixedChrome ? stageH : panelStageH,
              width: fixedChrome ? stageW : splitOnCanvas ? splitLayout?.stage.w : undefined,
            }
          : undefined
      }
    >
      <Stage
        ref={stageRef}
        width={splitOnCanvas || embedded ? CANVAS_W * fitScale : stageW}
        height={splitOnCanvas || embedded ? panelStageH * fitScale : stageH}
        scaleX={fitScale}
        scaleY={fitScale}
        style={{
          cursor: isPanActive
            ? isPanning
              ? "grabbing"
              : "grab"
            : tool === "select"
              ? imageSelected
                ? "move"
                : "default"
              : "crosshair",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onTouchStart={handleMouseDown as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchMove={handleMouseMove as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchEnd={finishDrawing}
      >
        <Layer>
          <Group x={contentOffsetX} y={contentOffsetY}>
          {!transparentStage && (
            <Rect
              x={0}
              y={0}
              width={CANVAS_W}
              height={logicalH}
              fill="#141414"
              listening={false}
            />
          )}
          {splitOnCanvas && !fixedChrome && (
            <Rect
              x={0}
              y={0}
              width={CANVAS_W}
              height={logicalH}
              fill="#ffffff"
              listening={false}
            />
          )}
          {multiMode && artboardSlots && multiArtboards
            ? artboardSlots.map((slot) => {
                const ab = multiArtboards.find((a) => a.id === slot.id);
                const entry = ab ? artboardImages.get(ab.id) : undefined;
                if (!ab || !entry) return null;
                const isActive = ab.id === activeArtboardId;
                const abOffset = ab.imageOffset ?? { x: 0, y: 0 };
                const abAnns = normalizeAnnotations(ab.annotations);
                const imgX = entry.fit.x + abOffset.x;
                const imgY = entry.fit.y + abOffset.y;
                const labelAbove = 22;
                const nameWidth = ab.name.length * 13;
                const imageDraggable =
                  isActive && tool === "select" && imageSelected && !isPanActive;
                const deletable =
                  Boolean(onDeleteArtboard && primaryArtboardId) &&
                  ab.id !== primaryArtboardId &&
                  !ab.viewImageMeta &&
                  tool === "select" &&
                  !interactionLocked;

                const confirmDeleteArtboard = () => {
                  if (!onDeleteArtboard || !deletable) return;
                  if (window.confirm(`删除「${ab.name}」？此操作不可撤销。`)) {
                    onDeleteArtboard(ab.id);
                  }
                };

                const imageAnchor = { x: imgX, y: imgY };
                if (isActive) {
                  imageCoordOriginRef.current = imageAnchor;
                }

                return (
                  <Group key={ab.id} x={slot.origin.x} y={slot.origin.y}>
                    <Group
                      x={imgX}
                      y={imgY}
                      draggable={imageDraggable}
                      onDragEnd={(e) => {
                        if (!isActive) return;
                        onImageOffsetChange?.({
                          x: e.target.x() - entry.fit.x,
                          y: e.target.y() - entry.fit.y,
                        });
                      }}
                    >
                      <Group y={-labelAbove} listening={false}>
                        <Text
                          text={ab.name}
                          x={0}
                          y={0}
                          fontSize={13}
                          fontStyle="600"
                          fill={isActive ? "#2563eb" : "#64748b"}
                          listening={false}
                        />
                        {deletable && (
                          <Group
                            x={nameWidth + 6}
                            y={-1}
                            onClick={(e) => {
                              e.cancelBubble = true;
                              confirmDeleteArtboard();
                            }}
                            onTap={(e) => {
                              e.cancelBubble = true;
                              confirmDeleteArtboard();
                            }}
                          >
                            <Rect
                              width={20}
                              height={18}
                              fill="#fee2e2"
                              cornerRadius={4}
                              stroke="#fecaca"
                              strokeWidth={1}
                            />
                            <Text
                              text="×"
                              x={5}
                              y={2}
                              fontSize={14}
                              fill="#dc2626"
                              listening={false}
                            />
                          </Group>
                        )}
                      </Group>
                      <KonvaImage
                        id={isActive ? "garment_image" : undefined}
                        image={entry.img}
                        x={0}
                        y={0}
                        width={entry.fit.width}
                        height={entry.fit.height}
                        listening={!isPanActive && !isDrawingMode}
                        draggable={false}
                        stroke={isActive && imageSelected ? "#2563eb" : isActive ? "#93c5fd" : undefined}
                        strokeWidth={isActive ? (imageSelected ? 2 : 1) : 0}
                        opacity={isActive ? 1 : 0.92}
                        onClick={(e) => {
                          if (tool !== "select") return;
                          e.cancelBubble = true;
                          if (!isActive) {
                            onActiveArtboardChange?.(ab.id);
                            return;
                          }
                          selectImage();
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          if (!isActive) {
                            onActiveArtboardChange?.(ab.id);
                            return;
                          }
                          if (tool !== "select") return;
                          selectImage();
                        }}
                      />
                      {abAnns.map((ann) =>
                        renderAnnotation(
                          ann,
                          isActive,
                          isLayerVisible(ann, layerVisibility),
                          imageAnchor,
                        ),
                      )}
                      {layerVisibility.process &&
                        computeSequenceBadges(
                          processItems ?? [],
                          filterAnnotationsByLayers(abAnns, {
                            process: true,
                            size: false,
                          }),
                        ).map((b) => (
                          <Group
                            key={`badge_${ab.id}_${b.processId}_${b.annotationId}`}
                            listening={false}
                          >
                            <Circle
                              x={b.x - imageAnchor.x + 14}
                              y={b.y - imageAnchor.y + 14}
                              radius={14}
                              fill="#2563eb"
                            />
                            <Text
                              x={b.x - imageAnchor.x + 14}
                              y={b.y - imageAnchor.y + 14}
                              text={b.label}
                              fontSize={14}
                              fill="#fff"
                              width={28}
                              height={28}
                              align="center"
                              verticalAlign="middle"
                              offsetX={14}
                              offsetY={14}
                            />
                          </Group>
                        ))}
                      {isActive && draftRect && (
                        <Rect
                          x={
                            draftRect.width < 0
                              ? draftRect.x + draftRect.width - imageAnchor.x
                              : draftRect.x - imageAnchor.x
                          }
                          y={
                            draftRect.height < 0
                              ? draftRect.y + draftRect.height - imageAnchor.y
                              : draftRect.y - imageAnchor.y
                          }
                          width={Math.abs(draftRect.width)}
                          height={Math.abs(draftRect.height)}
                          stroke="#22c55e"
                          dash={[6, 4]}
                          strokeWidth={2}
                          listening={false}
                        />
                      )}
                      {isActive && draftLine && (
                        <Arrow
                          points={[
                            draftLine.x - imageAnchor.x,
                            draftLine.y - imageAnchor.y,
                            draftLine.x2 - imageAnchor.x,
                            draftLine.y2 - imageAnchor.y,
                          ]}
                          stroke="#22c55e"
                          fill="#22c55e"
                          dash={[4, 4]}
                          listening={false}
                        />
                      )}
                      {isActive && freehandPoints.length > 1 && (
                        <Line
                          points={freehandPoints.map((v, i) =>
                            i % 2 === 0 ? v - imageAnchor.x : v - imageAnchor.y,
                          )}
                          stroke={color}
                          strokeWidth={3}
                          lineCap="round"
                          tension={0.4}
                          listening={false}
                        />
                      )}
                    </Group>
                  </Group>
                );
              })
            : null}
          {!multiMode && image && (() => {
            const singleImageAnchor = {
              x: imageFit.x + imageOffset.x,
              y: imageFit.y + imageOffset.y,
            };
            imageCoordOriginRef.current = singleImageAnchor;
            return (
              <Group
                x={singleImageAnchor.x}
                y={singleImageAnchor.y}
                draggable={tool === "select" && imageSelected && !isPanActive}
                onDragEnd={(e) => {
                  onImageOffsetChange?.({
                    x: e.target.x() - imageFit.x,
                    y: e.target.y() - imageFit.y,
                  });
                }}
              >
                <KonvaImage
                  id="garment_image"
                  image={image}
                  x={0}
                  y={0}
                  width={imageFit.width}
                  height={imageFit.height}
                  listening={!isDrawingMode && !isPanActive}
                  draggable={false}
                  stroke={imageSelected ? "#2563eb" : undefined}
                  strokeWidth={imageSelected ? 2 : 0}
                  onClick={(e) => {
                    if (tool !== "select") return;
                    e.cancelBubble = true;
                    selectImage();
                  }}
                  onTap={(e) => {
                    if (tool !== "select") return;
                    e.cancelBubble = true;
                    selectImage();
                  }}
                />
                {normalizedAnnotations.map((ann) =>
                  renderAnnotation(
                    ann,
                    true,
                    isLayerVisible(ann, layerVisibility),
                    singleImageAnchor,
                  ),
                )}
                {layerVisibility.process &&
                  sequenceBadges.map((b) => (
                    <Group
                      key={`badge_${b.processId}_${b.annotationId}_${b.x}`}
                      listening={false}
                    >
                      <Circle
                        x={b.x - singleImageAnchor.x + 14}
                        y={b.y - singleImageAnchor.y + 14}
                        radius={14}
                        fill="#2563eb"
                      />
                      <Text
                        x={b.x - singleImageAnchor.x + 14}
                        y={b.y - singleImageAnchor.y + 14}
                        text={b.label}
                        fontSize={14}
                        fill="#fff"
                        width={28}
                        height={28}
                        align="center"
                        verticalAlign="middle"
                        offsetX={14}
                        offsetY={14}
                      />
                    </Group>
                  ))}
                {draftRect && (
                  <Rect
                    x={
                      draftRect.width < 0
                        ? draftRect.x + draftRect.width - singleImageAnchor.x
                        : draftRect.x - singleImageAnchor.x
                    }
                    y={
                      draftRect.height < 0
                        ? draftRect.y + draftRect.height - singleImageAnchor.y
                        : draftRect.y - singleImageAnchor.y
                    }
                    width={Math.abs(draftRect.width)}
                    height={Math.abs(draftRect.height)}
                    stroke="#22c55e"
                    dash={[6, 4]}
                    strokeWidth={2}
                    listening={false}
                  />
                )}
                {draftLine && (
                  <Arrow
                    points={[
                      draftLine.x - singleImageAnchor.x,
                      draftLine.y - singleImageAnchor.y,
                      draftLine.x2 - singleImageAnchor.x,
                      draftLine.y2 - singleImageAnchor.y,
                    ]}
                    stroke="#22c55e"
                    fill="#22c55e"
                    dash={[4, 4]}
                    listening={false}
                  />
                )}
                {freehandPoints.length > 1 && (
                  <Line
                    points={freehandPoints.map((v, i) =>
                      i % 2 === 0 ? v - singleImageAnchor.x : v - singleImageAnchor.y,
                    )}
                    stroke={color}
                    strokeWidth={3}
                    lineCap="round"
                    tension={0.4}
                    listening={false}
                  />
                )}
              </Group>
            );
          })()}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox;
              return newBox;
            }}
          />
          {isPanActive && viewport && onViewportChange && (
            <Rect
              name="pan-overlay"
              x={-contentOffsetX}
              y={-contentOffsetY}
              width={logicalW}
              height={logicalH}
              fill="rgba(0,0,0,0.01)"
              listening
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onTouchStart={handlePanStart}
              onTouchMove={handlePanMove}
              onTouchEnd={handlePanEnd}
            />
          )}
          {isDrawingMode && (
            <Rect
              name="draw-overlay"
              x={-contentOffsetX}
              y={-contentOffsetY}
              width={logicalW}
              height={logicalH}
              fill="rgba(0,0,0,0.01)"
              listening
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={finishDrawing}
              onTouchStart={
                handleMouseDown as unknown as (
                  e: Konva.KonvaEventObject<TouchEvent>,
                ) => void
              }
              onTouchMove={
                handleMouseMove as unknown as (
                  e: Konva.KonvaEventObject<TouchEvent>,
                ) => void
              }
              onTouchEnd={finishDrawing}
            />
          )}
          </Group>
        </Layer>
      </Stage>

      {!displayImage && !multiMode && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-[#94a3b8]">
          点击「更换主图」导入款式图
        </p>
      )}
      {multiMode && artboardImages.size === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-[#94a3b8]">
          点击左侧生成款式图或更换主图
        </p>
      )}
      {multiMode && artboardSlots && multiArtboards && (
        <ViewRegenerateOverlays
          slots={artboardSlots}
          artboards={multiArtboards}
          primaryArtboardId={primaryArtboardId}
          contentOffsetX={contentOffsetX}
          contentOffsetY={contentOffsetY}
          fitScale={fitScale}
          regeneratingArtboardId={regeneratingArtboardId}
          interactionLocked={interactionLocked}
          onRegenerateView={onRegenerateView}
          onDeleteArtboard={onDeleteArtboard}
        />
      )}
    </div>
  );

  if (fixedChrome && stagePosition) {
    const toolbarPortal =
      toolbarAnchor && createPortal(toolbarEl, toolbarAnchor);

    return (
      <>
        {toolbarPortal}
        <div
          data-panel="stage"
          className="absolute z-[8] overflow-visible"
          style={{
            left: stagePosition.x,
            top: stagePosition.y,
            width: stageW,
            height: stageH,
          }}
        >
          {stageEl}
        </div>
      </>
    );
  }

  if (splitOnCanvas && splitLayout && onSplitLayoutChange) {
    return (
      <>
        <DraggablePanel
          id="tabs"
          title="画板视图"
          variant="tabs"
          x={splitLayout.tabs.x}
          y={splitLayout.tabs.y}
          width={splitLayout.tabs.w}
          scale={canvasScale}
          onMove={(x, y) => onSplitLayoutChange("tabs", { x, y })}
        >
          <div className="px-2 py-1.5">{tabsContent}</div>
        </DraggablePanel>

        <DraggablePanel
          id="toolbar"
          title="标注工具"
          variant="tool"
          x={splitLayout.toolbar.x}
          y={splitLayout.toolbar.y}
          width={splitLayout.toolbar.w}
          scale={canvasScale}
          onMove={(x, y) => onSplitLayoutChange("toolbar", { x, y })}
        >
          {toolbarEl}
        </DraggablePanel>

        <DraggablePanel
          id="stage"
          title="款式图 · 标注"
          variant="stage"
          x={splitLayout.stage.x}
          y={splitLayout.stage.y}
          width={splitLayout.stage.w}
          height={splitLayout.stage.h}
          scale={canvasScale}
          onMove={(x, y) => onSplitLayoutChange("stage", { x, y })}
        >
          {stageEl}
        </DraggablePanel>
      </>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden ${
        embedded
          ? "border-0 bg-[#141414]"
          : `border border-zinc-700/50 shadow-2xl rounded-xl ${className}`
      } ${embedded ? className : ""}`}
    >
      {toolbarEl}

      {showImport && !splitOnCanvas && (
        <div className="shrink-0 border-b border-zinc-700/50 bg-zinc-900 px-3 py-1.5">
          <label className="cursor-pointer text-xs text-zinc-400 hover:text-white">
            📎 更换图片
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const url = reader.result as string;
                  loadImage(url);
                  onImageChange?.(url);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      )}

      {stageEl}
    </div>
  );
}

export { CANVAS_W, CANVAS_H };
