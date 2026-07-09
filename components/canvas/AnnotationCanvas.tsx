"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { computeStudioStageBounds, computeImagePlacement } from "@/lib/canvas/bounds";
import { computeImageFit } from "@/lib/canvas/fit";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import type { Hotspot } from "@/types/process";
import type { Annotation } from "@/types/project";
import CanvasToolbar, { DEFAULT_ANNOTATION_COLOR } from "./CanvasToolbar";
import type { CanvasTool } from "@/types/canvas";
import DraggablePanel from "@/components/studio/DraggablePanel";
import type { PanelPosition } from "@/lib/studio/layout";
import { STUDIO_TOOLBAR_ANCHOR_ID } from "@/lib/studio/layout";

type Snapshot = { annotations: Annotation[]; hotspots: Hotspot[] };

type AnnotationCanvasProps = {
  imageUrl?: string | null;
  hotspots: Hotspot[];
  annotations: Annotation[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  selectedHotspotId?: string | null;
  onHotspotSelect?: (id: string | null) => void;
  showImport?: boolean;
  onImageChange?: (dataUrl: string) => void;
  nextMarkerIndex?: number;
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
  /** AI 智能标注（固定在顶部工具栏） */
  onSmartAnnotate?: () => void;
  smartAnnotateLoading?: boolean;
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
  "marker",
  "hotspot",
];

export default function AnnotationCanvas({
  imageUrl,
  hotspots,
  annotations,
  onHotspotsChange,
  onAnnotationsChange,
  selectedHotspotId,
  onHotspotSelect,
  showImport = false,
  onImageChange,
  nextMarkerIndex = 1,
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
  onSmartAnnotate,
  smartAnnotateLoading,
}: AnnotationCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageFit, setImageFit] = useState({ x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });
  const [tool, setTool] = useState<CanvasTool>("select");
  const [color, setColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [zoom, setZoom] = useState(1);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [imageSelected, setImageSelected] = useState(false);
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
  draftRectRef.current = draftRect;
  draftLineRef.current = draftLine;
  freehandRef.current = freehandPoints;
  isDrawingRef.current = isDrawing;
  toolRef.current = tool;

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const normalizedAnnotations = normalizeAnnotations(annotations);

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
    if (imageUrl) loadImage(imageUrl);
    else setImage(null);
  }, [imageUrl, loadImage]);

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
      hotspots: structuredClone(hotspots),
    });
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
    syncHistoryButtons();
  }, [annotations, hotspots]);

  const applySnapshot = (snap: Snapshot) => {
    onAnnotationsChange(snap.annotations);
    onHotspotsChange(snap.hotspots);
    setSelectedAnnId(null);
    onHotspotSelect?.(null);
  };

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({
      annotations: structuredClone(annotations),
      hotspots: structuredClone(hotspots),
    });
    applySnapshot(prev);
    syncHistoryButtons();
  }, [annotations, hotspots, onAnnotationsChange, onHotspotsChange, onHotspotSelect]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({
      annotations: structuredClone(annotations),
      hotspots: structuredClone(hotspots),
    });
    applySnapshot(next);
    syncHistoryButtons();
  }, [annotations, hotspots, onAnnotationsChange, onHotspotsChange, onHotspotSelect]);

  const commitAnnotations = (next: Annotation[]) => {
    pushHistory();
    onAnnotationsChange(next);
  };

  const commitHotspots = (next: Hotspot[]) => {
    pushHistory();
    onHotspotsChange(next);
  };

  const studioBounds = fixedChrome
    ? computeStudioStageBounds({
        imageFit: image ? imageFit : null,
        imageOffset,
        hotspots,
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
  const fitScale = baseFit * zoom;
  const stageW = logicalW * fitScale;
  const stageH = logicalH * fitScale;

  const getPointer = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return {
      x: pos.x / fitScale - contentOffsetX,
      y: pos.y / fitScale - contentOffsetY,
    };
  };

  const selectAnnotation = (id: string) => {
    setSelectedAnnId(id);
    setImageSelected(false);
    onHotspotSelect?.(null);
  };

  const selectHotspot = (id: string) => {
    onHotspotSelect?.(id);
    setSelectedAnnId(null);
    setImageSelected(false);
  };

  const selectImage = () => {
    setImageSelected(true);
    setSelectedAnnId(null);
    onHotspotSelect?.(null);
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
    return t === stage || t.getType() === "Layer";
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!image) return;
    const currentTool = toolRef.current;

    // 选择工具：点空白取消选中；点图片由图片自身处理
    if (currentTool === "select") {
      if (isEmptyTarget(e)) {
        setSelectedAnnId(null);
        setImageSelected(false);
        onHotspotSelect?.(null);
      }
      return;
    }

    const pos = getPointer(e);
    if (!pos) return;

    e.cancelBubble = true;
    setImageSelected(false);

    if (currentTool === "hotspot") {
      const next = { x: pos.x, y: pos.y, width: 0, height: 0 };
      draftRectRef.current = next;
      setDraftRect(next);
      onHotspotSelect?.(null);
      setSelectedAnnId(null);
      return;
    }

    if (currentTool === "rect" || currentTool === "circle") {
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

    if (currentTool === "marker") {
      const idx = nextMarkerIndex + annotations.filter((a) => a.type === "marker").length;
      commitAnnotations([
        ...annotations,
        {
          id: createId("ann"),
          type: "marker",
          color,
          x: pos.x,
          y: pos.y,
          markerIndex: idx,
          strokeWidth: 3,
        },
      ]);
      setTool("select");
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

  const finishDrawing = () => {
    const currentTool = toolRef.current;
    const rect = draftRectRef.current;
    const line = draftLineRef.current;
    const points = freehandRef.current;

    if (rect && (currentTool === "rect" || currentTool === "circle" || currentTool === "hotspot")) {
      const n = {
        x: rect.width < 0 ? rect.x + rect.width : rect.x,
        y: rect.height < 0 ? rect.y + rect.height : rect.y,
        width: Math.abs(rect.width),
        height: Math.abs(rect.height),
      };
      if (n.width > 8 && n.height > 8) {
        if (currentTool === "hotspot") {
          const hs: Hotspot = {
            id: createId("hs"),
            ...n,
            label: `部位 ${hotspots.length + 1}`,
          };
          commitHotspots([...hotspots, hs]);
          selectHotspot(hs.id);
        } else {
          const id = createId("ann");
          commitAnnotations([
            ...annotations,
            {
              id,
              type: currentTool,
              color,
              ...n,
              strokeWidth: 3,
            },
          ]);
          selectAnnotation(id);
        }
      }
      draftRectRef.current = null;
      setDraftRect(null);
      setTool("select");
    }

    if (line && (currentTool === "arrow" || currentTool === "dimension")) {
      const { x, y, x2, y2 } = line;
      if (Math.hypot(x2 - x, y2 - y) > 12) {
        let text: string | undefined;
        if (currentTool === "dimension") {
          text = window.prompt("尺寸数值（如 52cm）", "") ?? undefined;
        }
        const id = createId("ann");
        commitAnnotations([
          ...annotations,
          {
            id,
            type: currentTool,
            color,
            x,
            y,
            x2,
            y2,
            text: text?.trim() || undefined,
            strokeWidth: 3,
          },
        ]);
        selectAnnotation(id);
      }
      draftLineRef.current = null;
      setDraftLine(null);
      setTool("select");
    }

    if (isDrawingRef.current && currentTool === "freehand" && points.length > 4) {
      const id = createId("ann");
      commitAnnotations([
        ...annotations,
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
  };

  const deleteSelected = useCallback(() => {
    if (selectedAnnId) {
      pushHistory();
      onAnnotationsChange(annotations.filter((a) => a.id !== selectedAnnId));
      setSelectedAnnId(null);
      syncHistoryButtons();
    } else if (selectedHotspotId) {
      commitHotspots(hotspots.filter((h) => h.id !== selectedHotspotId));
      onHotspotSelect?.(null);
    }
  }, [
    selectedAnnId,
    selectedHotspotId,
    annotations,
    hotspots,
    pushHistory,
    onAnnotationsChange,
    onHotspotSelect,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
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
  }, [deleteSelected, undo, redo]);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedAnnId) {
      const node = stage.findOne(`#ann_${selectedAnnId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    if (selectedHotspotId) {
      const node = stage.findOne(`#hs_${selectedHotspotId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedAnnId, selectedHotspotId, annotations, hotspots]);

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

    if (ann.type === "marker") {
      updateAnnotation(id, { x: node.x(), y: node.y() });
    } else if (ann.type === "rect" || ann.type === "circle") {
      updateAnnotation(id, { x: node.x(), y: node.y() });
    } else if (ann.type === "text") {
      updateAnnotation(id, { x: node.x(), y: node.y() });
    } else if (ann.type === "arrow" || ann.type === "dimension") {
      const dx = node.x();
      const dy = node.y();
      node.position({ x: 0, y: 0 });
      updateAnnotation(id, {
        x: (ann.x ?? 0) + dx,
        y: (ann.y ?? 0) + dy,
        x2: (ann.x2 ?? ann.x) + dx,
        y2: (ann.y2 ?? ann.y) + dy,
      });
    }
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

    if (ann.type === "rect") {
      updateAnnotation(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(8, (ann.width ?? 0) * scaleX),
        height: Math.max(8, (ann.height ?? 0) * scaleY),
      });
    } else if (ann.type === "circle") {
      updateAnnotation(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(8, (ann.width ?? 0) * scaleX),
        height: Math.max(8, (ann.height ?? 0) * scaleY),
      });
    }
  };

  const renderAnnotation = (ann: Annotation) => {
    const c = ann.color ?? DEFAULT_ANNOTATION_COLOR;
    const sw = ann.strokeWidth ?? 3;
    const isSelected = selectedAnnId === ann.id;
    const draggable = tool === "select";

    switch (ann.type) {
      case "rect":
        return (
          <Rect
            key={ann.id}
            id={`ann_${ann.id}`}
            x={ann.x}
            y={ann.y}
            width={ann.width ?? 0}
            height={ann.height ?? 0}
            stroke={c}
            strokeWidth={isSelected ? sw + 1 : sw}
            fill={`${c}22`}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
            onTransformEnd={(e) => handleAnnTransformEnd(ann.id, e)}
          />
        );
      case "circle":
        return (
          <Rect
            key={ann.id}
            id={`ann_${ann.id}`}
            x={ann.x}
            y={ann.y}
            width={ann.width ?? 0}
            height={ann.height ?? 0}
            cornerRadius={9999}
            stroke={c}
            strokeWidth={isSelected ? sw + 1 : sw}
            fill={`${c}22`}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
            onTransformEnd={(e) => handleAnnTransformEnd(ann.id, e)}
          />
        );
      case "arrow":
      case "dimension":
        return (
          <Group
            key={ann.id}
            id={`ann_${ann.id}`}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
          >
            <Arrow
              points={[ann.x, ann.y, ann.x2 ?? ann.x, ann.y2 ?? ann.y]}
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
                x={(ann.x2 ?? ann.x) + 6}
                y={(ann.y2 ?? ann.y) - 8}
                text={ann.text}
                fontSize={14}
                fill={c}
                fontStyle="bold"
                listening={false}
              />
            )}
          </Group>
        );
      case "text":
        return (
          <Text
            key={ann.id}
            id={`ann_${ann.id}`}
            x={ann.x}
            y={ann.y}
            text={ann.text ?? ""}
            fontSize={16}
            fill={c}
            fontStyle="bold"
            padding={4}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
          />
        );
      case "marker": {
        const num = ann.markerIndex ?? 1;
        const label = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"][num - 1] ?? `${num}`;
        return (
          <Group
            key={ann.id}
            id={`ann_${ann.id}`}
            x={ann.x}
            y={ann.y}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
            onDragEnd={(e) => handleAnnDragEnd(ann.id, e)}
          >
            <Circle radius={14} fill={c} stroke={isSelected ? "#fff" : undefined} strokeWidth={2} />
            <Text
              text={label}
              fontSize={14}
              fill="#fff"
              width={28}
              height={28}
              align="center"
              verticalAlign="middle"
              offsetX={14}
              offsetY={14}
              listening={false}
            />
          </Group>
        );
      }
      case "freehand":
        return (
          <Line
            key={ann.id}
            id={`ann_${ann.id}`}
            points={ann.points ?? []}
            stroke={c}
            strokeWidth={isSelected ? sw + 1 : sw}
            lineCap="round"
            lineJoin="round"
            tension={0.4}
            hitStrokeWidth={16}
            draggable={draggable}
            onClick={(e) => handleAnnClick(e, ann.id)}
            onTap={(e) => handleAnnClick(e, ann.id)}
          />
        );
      default:
        return null;
    }
  };

  const toolbarHint =
    tool !== "select"
      ? "绘制完成后自动切回选择"
      : imageSelected
        ? "款式图已选中 — 可拖动位置"
        : selectedAnnId || selectedHotspotId
          ? "已选中 — Delete 删除 · Ctrl+Z 撤销"
          : "点击款式图或标注进行选中";

  const toolbarEl = (
    <CanvasToolbar
      tool={tool}
      onToolChange={(t) => {
        setTool(t);
        if (t !== "select") setImageSelected(false);
      }}
      color={color}
      onColorChange={setColor}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      onDelete={deleteSelected}
      canDelete={Boolean(selectedAnnId || selectedHotspotId)}
      zoom={zoom}
      onZoomChange={setZoom}
      flat
      theme={fixedChrome || splitOnCanvas ? "light" : "dark"}
      hint={toolbarHint}
      onSmartAnnotate={onSmartAnnotate}
      smartAnnotateLoading={smartAnnotateLoading}
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
        style={{ cursor: tool === "select" ? (imageSelected ? "move" : "default") : "crosshair" }}
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
          {/* 透明命中区：保证绘制工具在空白处也能收到事件 */}
          {transparentStage && (
            <Rect
              x={-contentOffsetX}
              y={-contentOffsetY}
              width={logicalW}
              height={logicalH}
              fill="rgba(0,0,0,0)"
              listening
            />
          )}
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
          {image && (
            <KonvaImage
              id="garment_image"
              image={image}
              x={imageFit.x + imageOffset.x}
              y={imageFit.y + imageOffset.y}
              width={imageFit.width}
              height={imageFit.height}
              listening
              draggable={tool === "select" && imageSelected}
              stroke={imageSelected ? "#2563eb" : undefined}
              strokeWidth={imageSelected ? 2 : 0}
              onMouseDown={(e) => {
                // 绘制工具：点击图片时开始绘制，不要选中图片
                if (tool !== "select") {
                  e.cancelBubble = false;
                  return;
                }
              }}
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
              onDragEnd={(e) => {
                onImageOffsetChange?.({
                  x: e.target.x() - imageFit.x,
                  y: e.target.y() - imageFit.y,
                });
              }}
            />
          )}
          {normalizedAnnotations.map(renderAnnotation)}
          {hotspots.map((hs) => (
            <Rect
              key={hs.id}
              id={`hs_${hs.id}`}
              x={hs.x}
              y={hs.y}
              width={hs.width}
              height={hs.height}
              stroke={selectedHotspotId === hs.id ? "#60a5fa" : "#93c5fd"}
              strokeWidth={selectedHotspotId === hs.id ? 2 : 1}
              dash={[6, 3]}
              fill={
                selectedHotspotId === hs.id
                  ? "rgba(59, 130, 246, 0.12)"
                  : "rgba(59, 130, 246, 0.03)"
              }
              draggable={tool === "select"}
              onClick={(e) => {
                e.cancelBubble = true;
                if (tool === "select" || !DRAW_TOOLS.includes(tool)) {
                  selectHotspot(hs.id);
                }
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                selectHotspot(hs.id);
                if (tool !== "select") setTool("select");
              }}
              onDragEnd={(e) => {
                pushHistory();
                const next = hotspots.map((h) =>
                  h.id === hs.id ? { ...h, x: e.target.x(), y: e.target.y() } : h,
                );
                onHotspotsChange(next);
              }}
            />
          ))}
          {draftRect && (
            <Rect
              x={draftRect.width < 0 ? draftRect.x + draftRect.width : draftRect.x}
              y={draftRect.height < 0 ? draftRect.y + draftRect.height : draftRect.y}
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
              points={[draftLine.x, draftLine.y, draftLine.x2, draftLine.y2]}
              stroke="#22c55e"
              fill="#22c55e"
              dash={[4, 4]}
              listening={false}
            />
          )}
          {freehandPoints.length > 1 && (
            <Line
              points={freehandPoints}
              stroke={color}
              strokeWidth={3}
              lineCap="round"
              tension={0.4}
              listening={false}
            />
          )}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox;
              return newBox;
            }}
          />
          </Group>
        </Layer>
      </Stage>

      {!image && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-[#94a3b8]">
          点击「更换图片」导入款式图
        </p>
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
          onPointerDown={(e) => e.stopPropagation()}
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
