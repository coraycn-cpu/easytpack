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
};

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

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
}: AnnotationCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageFit, setImageFit] = useState({ x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });
  const [tool, setTool] = useState<CanvasTool>("select");
  const [color, setColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [zoom, setZoom] = useState(1);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

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
  const [historyTick, setHistoryTick] = useState(0);
  const bumpHistory = () => setHistoryTick((t) => t + 1);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const normalizedAnnotations = normalizeAnnotations(annotations);

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

  const pushHistory = useCallback(() => {
    undoStack.current.push({
      annotations: [...annotations],
      hotspots: [...hotspots],
    });
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
    bumpHistory();
  }, [annotations, hotspots]);

  const applySnapshot = (snap: Snapshot) => {
    onAnnotationsChange(snap.annotations);
    onHotspotsChange(snap.hotspots);
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ annotations: [...annotations], hotspots: [...hotspots] });
    applySnapshot(prev);
    bumpHistory();
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ annotations: [...annotations], hotspots: [...hotspots] });
    applySnapshot(next);
    bumpHistory();
  };

  const commitAnnotations = (next: Annotation[]) => {
    pushHistory();
    onAnnotationsChange(next);
  };

  const commitHotspots = (next: Hotspot[]) => {
    pushHistory();
    onHotspotsChange(next);
  };

  const getPointer = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / zoom, y: pos.y / zoom };
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!image) return;
    const pos = getPointer(e);
    if (!pos) return;

    if (tool === "select") {
      if (e.target === e.target.getStage()) {
        setSelectedAnnId(null);
        onHotspotSelect?.(null);
      }
      return;
    }

    if (tool === "hotspot") {
      setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      onHotspotSelect?.(null);
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

  const handleMouseUp = () => {
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
          onHotspotSelect?.(hs.id);
        } else {
          commitAnnotations([
            ...annotations,
            {
              id: createId("ann"),
              type: tool,
              color,
              ...n,
              strokeWidth: 3,
            },
          ]);
        }
      }
      setDraftRect(null);
    }

    if (draftLine && (tool === "arrow" || tool === "dimension")) {
      const { x, y, x2, y2 } = draftLine;
      if (Math.hypot(x2 - x, y2 - y) > 12) {
        let text: string | undefined;
        if (tool === "dimension") {
          text = window.prompt("尺寸数值（如 52cm）", "") ?? undefined;
        }
        commitAnnotations([
          ...annotations,
          {
            id: createId("ann"),
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
      }
      setDraftLine(null);
    }

    if (isDrawing && tool === "freehand" && freehandPoints.length > 4) {
      commitAnnotations([
        ...annotations,
        {
          id: createId("ann"),
          type: "freehand",
          color,
          x: 0,
          y: 0,
          points: [...freehandPoints],
          strokeWidth: 3,
        },
      ]);
    }
    setIsDrawing(false);
    setFreehandPoints([]);
  };

  const deleteSelected = () => {
    if (selectedAnnId) {
      pushHistory();
      onAnnotationsChange(annotations.filter((a) => a.id !== selectedAnnId));
      setSelectedAnnId(null);
    } else if (selectedHotspotId) {
      commitHotspots(hotspots.filter((h) => h.id !== selectedHotspotId));
      onHotspotSelect?.(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      if (e.ctrlKey && e.key === "z") {
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
  });

  useEffect(() => {
    if (!selectedHotspotId) return;
    const node = stageRef.current?.findOne(`#hs_${selectedHotspotId}`);
    if (node && transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedHotspotId, hotspots]);

  const renderAnnotation = (ann: Annotation) => {
    const c = ann.color ?? DEFAULT_ANNOTATION_COLOR;
    const sw = ann.strokeWidth ?? 3;

    switch (ann.type) {
      case "rect":
        return (
          <Rect
            key={ann.id}
            x={ann.x}
            y={ann.y}
            width={ann.width ?? 0}
            height={ann.height ?? 0}
            stroke={c}
            strokeWidth={sw}
            fill={`${c}22`}
            onClick={() => {
              if (tool === "select") setSelectedAnnId(ann.id);
            }}
          />
        );
      case "circle":
        return (
          <Circle
            key={ann.id}
            x={ann.x + (ann.width ?? 0) / 2}
            y={ann.y + (ann.height ?? 0) / 2}
            radius={Math.max(ann.width ?? 0, ann.height ?? 0) / 2}
            stroke={c}
            strokeWidth={sw}
            fill={`${c}22`}
            onClick={() => tool === "select" && setSelectedAnnId(ann.id)}
          />
        );
      case "arrow":
      case "dimension":
        return (
          <Group key={ann.id}>
            <Arrow
              points={[ann.x, ann.y, ann.x2 ?? ann.x, ann.y2 ?? ann.y]}
              stroke={c}
              fill={c}
              strokeWidth={sw}
              pointerLength={10}
              pointerWidth={10}
              dash={ann.type === "dimension" ? [8, 4] : undefined}
              onClick={() => tool === "select" && setSelectedAnnId(ann.id)}
            />
            {ann.text && (
              <Text
                x={(ann.x2 ?? ann.x) + 6}
                y={(ann.y2 ?? ann.y) - 8}
                text={ann.text}
                fontSize={14}
                fill={c}
                fontStyle="bold"
              />
            )}
          </Group>
        );
      case "text":
        return (
          <Text
            key={ann.id}
            x={ann.x}
            y={ann.y}
            text={ann.text ?? ""}
            fontSize={16}
            fill={c}
            fontStyle="bold"
            padding={4}
            onClick={() => tool === "select" && setSelectedAnnId(ann.id)}
          />
        );
      case "marker": {
        const num = ann.markerIndex ?? 1;
        const label = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"][num - 1] ?? `${num}`;
        return (
          <Group
            key={ann.id}
            x={ann.x}
            y={ann.y}
            onClick={() => tool === "select" && setSelectedAnnId(ann.id)}
          >
            <Circle radius={14} fill={c} />
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
            />
          </Group>
        );
      }
      case "freehand":
        return (
          <Line
            key={ann.id}
            points={ann.points ?? []}
            stroke={c}
            strokeWidth={sw}
            lineCap="round"
            lineJoin="round"
            tension={0.4}
            onClick={() => tool === "select" && setSelectedAnnId(ann.id)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-700/50 shadow-2xl">
      <CanvasToolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.current.length > 0}
        canRedo={redoStack.current.length > 0}
        historyTick={historyTick}
        onDelete={deleteSelected}
        canDelete={Boolean(selectedAnnId || selectedHotspotId)}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {showImport && (
        <div className="border-b border-zinc-700/50 bg-zinc-900 px-3 py-1.5">
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

      <div className="flex flex-1 items-center justify-center overflow-auto bg-[#0f0f14] p-4 min-h-[65vh]">
        <Stage
          ref={stageRef}
          width={CANVAS_W * zoom}
          height={CANVAS_H * zoom}
          scaleX={zoom}
          scaleY={zoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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
                strokeWidth={selectedHotspotId === hs.id ? 2 : 1.5}
                dash={[6, 3]}
                fill="rgba(59, 130, 246, 0.08)"
                draggable={tool === "select"}
                onClick={() => {
                  if (tool === "select") {
                    onHotspotSelect?.(hs.id);
                    setSelectedAnnId(null);
                  }
                }}
                onDragEnd={(e) => {
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
              />
            )}
            {draftLine && (
              <Arrow
                points={[draftLine.x, draftLine.y, draftLine.x2, draftLine.y2]}
                stroke="#22c55e"
                fill="#22c55e"
                dash={[4, 4]}
              />
            )}
            {freehandPoints.length > 1 && (
              <Line
                points={freehandPoints}
                stroke={color}
                strokeWidth={3}
                lineCap="round"
                tension={0.4}
              />
            )}
            <Transformer ref={transformerRef} rotateEnabled={false} />
          </Layer>
        </Stage>
      </div>

      {!image && (
        <p className="bg-zinc-900 py-6 text-center text-sm text-zinc-500">
          导入款式图后，使用工具栏标注 — 类似微信截图标注
        </p>
      )}
    </div>
  );
}

export { CANVAS_W, CANVAS_H };
