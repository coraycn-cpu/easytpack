"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Line,
  Text,
  Transformer,
  Arrow,
} from "react-konva";
import type Konva from "konva";
import type { Hotspot } from "@/types/process";
import type { Annotation } from "@/types/project";

export type CanvasTool = "select" | "hotspot" | "arrow" | "label";

type StyleCanvasProps = {
  imageUrl?: string | null;
  hotspots: Hotspot[];
  annotations: Annotation[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  selectedHotspotId?: string | null;
  onHotspotSelect?: (id: string | null) => void;
  tool?: CanvasTool;
  showImport?: boolean;
  onImageChange?: (dataUrl: string) => void;
};

const STAGE_W = 800;
const STAGE_H = 600;

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function StyleCanvas({
  imageUrl,
  hotspots,
  annotations,
  onHotspotsChange,
  onAnnotationsChange,
  selectedHotspotId,
  onHotspotSelect,
  tool = "select",
  showImport = false,
  onImageChange,
}: StyleCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [draftArrow, setDraftArrow] = useState<{
    x: number;
    y: number;
    x2: number;
    y2: number;
  } | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const loadImage = useCallback((url: string) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = url;
  }, []);

  useEffect(() => {
    if (imageUrl) loadImage(imageUrl);
    else setImage(null);
  }, [imageUrl, loadImage]);

  useEffect(() => {
    if (!selectedHotspotId) {
      transformerRef.current?.nodes([]);
      return;
    }
    const node = stageRef.current?.findOne(`#${selectedHotspotId}`);
    if (node && transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedHotspotId, hotspots]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      loadImage(url);
      onImageChange?.(url);
    };
    reader.readAsDataURL(file);
  };

  const getPointer = (e: Konva.KonvaEventObject<MouseEvent>) => {
    return e.target.getStage()?.getPointerPosition() ?? null;
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!image) return;
    const pos = getPointer(e);
    if (!pos) return;

    if (tool === "hotspot" && e.target === e.target.getStage()) {
      setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      onHotspotSelect?.(null);
    }

    if (tool === "arrow") {
      setDraftArrow({ x: pos.x, y: pos.y, x2: pos.x, y2: pos.y });
    }

    if (tool === "label") {
      const text = window.prompt("标注文字", "工艺说明");
      if (text?.trim()) {
        onAnnotationsChange([
          ...annotations,
          { id: createId("ann"), type: "label", x: pos.x, y: pos.y, text: text.trim() },
        ]);
      }
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
    if (draftArrow) {
      setDraftArrow({ ...draftArrow, x2: pos.x, y2: pos.y });
    }
  };

  const handleMouseUp = () => {
    if (draftRect && tool === "hotspot") {
      const n = {
        x: draftRect.width < 0 ? draftRect.x + draftRect.width : draftRect.x,
        y: draftRect.height < 0 ? draftRect.y + draftRect.height : draftRect.y,
        width: Math.abs(draftRect.width),
        height: Math.abs(draftRect.height),
      };
      if (n.width > 10 && n.height > 10) {
        const hs: Hotspot = {
          id: createId("hs"),
          ...n,
          label: `部位 ${hotspots.length + 1}`,
        };
        onHotspotsChange([...hotspots, hs]);
        onHotspotSelect?.(hs.id);
      }
      setDraftRect(null);
    }

    if (draftArrow && tool === "arrow") {
      const dx = draftArrow.x2 - draftArrow.x;
      const dy = draftArrow.y2 - draftArrow.y;
      if (Math.hypot(dx, dy) > 15) {
        onAnnotationsChange([
          ...annotations,
          {
            id: createId("ann"),
            type: "arrow",
            x: draftArrow.x,
            y: draftArrow.y,
            x2: draftArrow.x2,
            y2: draftArrow.y2,
          },
        ]);
      }
      setDraftArrow(null);
    }
  };

  const updateHotspot = (id: string, attrs: Partial<Hotspot>) => {
    onHotspotsChange(hotspots.map((h) => (h.id === id ? { ...h, ...attrs } : h)));
  };

  const deleteSelected = () => {
    if (!selectedHotspotId) return;
    onHotspotsChange(hotspots.filter((h) => h.id !== selectedHotspotId));
    onHotspotSelect?.(null);
    transformerRef.current?.nodes([]);
  };

  const toolHint: Record<CanvasTool, string> = {
    select: "选择模式：点击热区选中",
    hotspot: "框选模式：拖拽绘制热区",
    arrow: "引线模式：拖拽绘制箭头",
    label: "文字标注：点击画布添加",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {showImport && (
          <label className="cursor-pointer rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            导入图片
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        )}
        {tool === "select" && selectedHotspotId && (
          <button
            type="button"
            onClick={deleteSelected}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            删除热区
          </button>
        )}
        <span className="text-xs text-zinc-400">{toolHint[tool]}</span>
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-2">
        <Stage
          ref={stageRef}
          width={STAGE_W}
          height={STAGE_H}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="mx-auto bg-white shadow-sm"
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        >
          <Layer>
            {image && (
              <KonvaImage image={image} width={STAGE_W} height={STAGE_H} listening={false} />
            )}
            {annotations.map((ann) =>
              ann.type === "arrow" && ann.x2 != null && ann.y2 != null ? (
                <Arrow
                  key={ann.id}
                  points={[ann.x, ann.y, ann.x2, ann.y2]}
                  stroke="#dc2626"
                  fill="#dc2626"
                  strokeWidth={2}
                  pointerLength={8}
                  pointerWidth={8}
                />
              ) : ann.type === "label" && ann.text ? (
                <Text
                  key={ann.id}
                  x={ann.x}
                  y={ann.y}
                  text={ann.text}
                  fontSize={13}
                  fill="#dc2626"
                  fontStyle="bold"
                />
              ) : null,
            )}
            {hotspots.map((hs) => (
              <Rect
                key={hs.id}
                id={hs.id}
                x={hs.x}
                y={hs.y}
                width={hs.width}
                height={hs.height}
                stroke={selectedHotspotId === hs.id ? "#1d4ed8" : "#2563eb"}
                strokeWidth={selectedHotspotId === hs.id ? 3 : 2}
                fill="rgba(37, 99, 235, 0.15)"
                draggable={tool === "select"}
                onClick={() => {
                  if (tool === "select") onHotspotSelect?.(hs.id);
                }}
                onTap={() => {
                  if (tool === "select") onHotspotSelect?.(hs.id);
                }}
                onDragEnd={(e) => {
                  updateHotspot(hs.id, { x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const sx = node.scaleX();
                  const sy = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  updateHotspot(hs.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(10, node.width() * sx),
                    height: Math.max(10, node.height() * sy),
                  });
                }}
              />
            ))}
            {draftRect && (
              <Rect
                x={draftRect.width < 0 ? draftRect.x + draftRect.width : draftRect.x}
                y={draftRect.height < 0 ? draftRect.y + draftRect.height : draftRect.y}
                width={Math.abs(draftRect.width)}
                height={Math.abs(draftRect.height)}
                stroke="#16a34a"
                dash={[6, 4]}
                strokeWidth={2}
                fill="rgba(22, 163, 74, 0.1)"
              />
            )}
            {draftArrow && (
              <Line
                points={[draftArrow.x, draftArrow.y, draftArrow.x2, draftArrow.y2]}
                stroke="#16a34a"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )}
            <Transformer ref={transformerRef} rotateEnabled={false} />
          </Layer>
        </Stage>
      </div>

      {!image && (
        <p className="text-center text-xs text-zinc-400">请导入或选择带图的画板页</p>
      )}
    </div>
  );
}
