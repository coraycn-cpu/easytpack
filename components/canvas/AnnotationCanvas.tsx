"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { computeImageFit } from "@/lib/canvas/fit";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import type { Hotspot } from "@/types/process";
import type { Annotation } from "@/types/project";
import CanvasToolbar, { DEFAULT_ANNOTATION_COLOR } from "./CanvasToolbar";
import type { CanvasTool } from "@/types/canvas";

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
}: AnnotationCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageFit, setImageFit] = useState({ x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });
  const [tool, setTool] = useState<CanvasTool>("select");
  const [color, setColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [zoom, setZoom] = useState(1);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: CANVAS_W, h: CANVAS_H });

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

  const loadImage = useCallback((url: string) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImageFit(computeImageFit(img.naturalWidth, img.naturalHeight));
    };
    img.src = url;
  }, []);

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

  const fitScale =
    Math.min(containerSize.w / CANVAS_W, containerSize.h / CANVAS_H, 1.2) * zoom;
  const stageW = CANVAS_W * fitScale;
  const stageH = CANVAS_H * fitScale;

  const getPointer = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / fitScale, y: pos.y / fitScale };
  };

  const selectAnnotation = (id: string) => {
    setSelectedAnnId(id);
    onHotspotSelect?.(null);
  };

  const selectHotspot = (id: string) => {
    onHotspotSelect?.(id);
    setSelectedAnnId(null);
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

    if (tool === "select") {
      if (isEmptyTarget(e)) {
        setSelectedAnnId(null);
        onHotspotSelect?.(null);
      }
      return;
    }

    const pos = getPointer(e);
    if (!pos) return;

    if (tool === "hotspot") {
      setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      onHotspotSelect?.(null);
      setSelectedAnnId(null);
      return;
    }

    if (tool === "rect" || tool === "circle") {
      setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (tool === "arrow" || tool === "dimension") {
      setDraftLine({ x: pos.x, y: pos.y, x2: pos.x, y2: pos.y });
      return;
    }

    if (tool === "text") {
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

    if (tool === "marker") {
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

    if (tool === "freehand") {
      setIsDrawing(true);
      setFreehandPoints([pos.x, pos.y]);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getPointer(e);
    if (!pos) return;

    if (draftRect) {
      setDraftRect({
        ...draftRect,
        width: pos.x - draftRect.x,
        height: pos.y - draftRect.y,
      });
    }
    if (draftLine) {
      setDraftLine({ ...draftLine, x2: pos.x, y2: pos.y });
    }
    if (isDrawing && tool === "freehand") {
      setFreehandPoints((pts) => [...pts, pos.x, pos.y]);
    }
  };

  const finishDrawing = () => {
    if (draftRect && (tool === "rect" || tool === "circle" || tool === "hotspot")) {
      const n = {
        x: draftRect.width < 0 ? draftRect.x + draftRect.width : draftRect.x,
        y: draftRect.height < 0 ? draftRect.y + draftRect.height : draftRect.y,
        width: Math.abs(draftRect.width),
        height: Math.abs(draftRect.height),
      };
      if (n.width > 8 && n.height > 8) {
        if (tool === "hotspot") {
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
              type: tool,
              color,
              ...n,
              strokeWidth: 3,
            },
          ]);
          selectAnnotation(id);
        }
      }
      setDraftRect(null);
      setTool("select");
    }

    if (draftLine && (tool === "arrow" || tool === "dimension")) {
      const { x, y, x2, y2 } = draftLine;
      if (Math.hypot(x2 - x, y2 - y) > 12) {
        let text: string | undefined;
        if (tool === "dimension") {
          text = window.prompt("尺寸数值（如 52cm）", "") ?? undefined;
        }
        const id = createId("ann");
        commitAnnotations([
          ...annotations,
          {
            id,
            type: tool,
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
      setDraftLine(null);
      setTool("select");
    }

    if (isDrawing && tool === "freehand" && freehandPoints.length > 4) {
      const id = createId("ann");
      commitAnnotations([
        ...annotations,
        {
          id,
          type: "freehand",
          color,
          x: 0,
          y: 0,
          points: [...freehandPoints],
          strokeWidth: 3,
        },
      ]);
      selectAnnotation(id);
      setTool("select");
    }
    setIsDrawing(false);
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

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-700/50 shadow-2xl ${className}`}
    >
      <CanvasToolbar
        tool={tool}
        onToolChange={setTool}
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
        hint={
          tool !== "select"
            ? "绘制完成后自动切回选择；点击标注可选中"
            : selectedAnnId || selectedHotspotId
              ? "已选中 — 可拖动、Delete 删除、Ctrl+Z 撤销"
              : "点击标注选中，或选择工具绘制"
        }
      />

      {showImport && (
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

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0f0f14]"
      >
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          scaleX={fitScale}
          scaleY={fitScale}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                x={imageFit.x}
                y={imageFit.y}
                width={imageFit.width}
                height={imageFit.height}
                listening={false}
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
                stroke={selectedHotspotId === hs.id ? "#60a5fa" : "#3b82f6"}
                strokeWidth={selectedHotspotId === hs.id ? 2.5 : 1.5}
                dash={[6, 3]}
                fill="rgba(59, 130, 246, 0.08)"
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
          </Layer>
        </Stage>

        {!image && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            导入款式图后，使用工具栏标注 — 类似微信截图标注
          </p>
        )}
      </div>
    </div>
  );
}

export { CANVAS_W, CANVAS_H };
