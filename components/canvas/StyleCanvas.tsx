"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { Hotspot } from "@/types/process";

type StyleCanvasProps = {
  hotspots: Hotspot[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
  initialImageUrl?: string | null;
  selectedHotspotId?: string | null;
  onHotspotSelect?: (id: string | null) => void;
  showImport?: boolean;
};

function useLoadedImage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const load = useCallback((url: string) => {
    setImageUrl(url);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = url;
  }, []);

  const clear = useCallback(() => {
    setImage(null);
    setImageUrl(null);
  }, []);

  return { image, imageUrl, load, clear };
}

function createId() {
  return `hs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function StyleCanvas({
  hotspots,
  onHotspotsChange,
  initialImageUrl,
  selectedHotspotId,
  onHotspotSelect,
  showImport = true,
}: StyleCanvasProps) {
  const [drawMode, setDrawMode] = useState(false);
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { image, imageUrl, load, clear } = useLoadedImage();

  const stageWidth = 800;
  const stageHeight = 600;

  useEffect(() => {
    if (initialImageUrl) load(initialImageUrl);
  }, [initialImageUrl, load]);

  useEffect(() => {
    if (!selectedHotspotId) {
      transformerRef.current?.nodes([]);
      return;
    }
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const node = stage.findOne(`#${selectedHotspotId}`);
    if (node) {
      transformer.nodes([node]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedHotspotId, hotspots]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    load(URL.createObjectURL(file));
    onHotspotsChange([]);
    onHotspotSelect?.(null);
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawMode || !image) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    if (e.target === stage) {
      setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      onHotspotSelect?.(null);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawMode || !draftRect) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    setDraftRect({
      ...draftRect,
      width: pos.x - draftRect.x,
      height: pos.y - draftRect.y,
    });
  };

  const handleStageMouseUp = () => {
    if (!drawMode || !draftRect) return;
    const normalized = {
      x: draftRect.width < 0 ? draftRect.x + draftRect.width : draftRect.x,
      y: draftRect.height < 0 ? draftRect.y + draftRect.height : draftRect.y,
      width: Math.abs(draftRect.width),
      height: Math.abs(draftRect.height),
    };
    if (normalized.width > 10 && normalized.height > 10) {
      const newHotspot: Hotspot = {
        id: createId(),
        ...normalized,
        label: `部位 ${hotspots.length + 1}`,
      };
      onHotspotsChange([...hotspots, newHotspot]);
      onHotspotSelect?.(newHotspot.id);
    }
    setDraftRect(null);
    setDrawMode(false);
  };

  const handleSelect = (id: string) => {
    onHotspotSelect?.(id);
    setDrawMode(false);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {showImport && (
          <label className="cursor-pointer rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            导入款式图
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        )}
        <button
          type="button"
          disabled={!image}
          onClick={() => setDrawMode(true)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {drawMode ? "拖拽框选..." : "添加热区"}
        </button>
        <button
          type="button"
          disabled={!selectedHotspotId}
          onClick={deleteSelected}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          删除选中
        </button>
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-2">
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          className="mx-auto bg-white shadow-sm"
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                width={stageWidth}
                height={stageHeight}
                listening={false}
              />
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
                draggable
                onClick={() => handleSelect(hs.id)}
                onTap={() => handleSelect(hs.id)}
                onDragEnd={(e) => {
                  updateHotspot(hs.id, { x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  updateHotspot(hs.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(10, node.width() * scaleX),
                    height: Math.max(10, node.height() * scaleY),
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
                strokeWidth={2}
                dash={[6, 4]}
                fill="rgba(22, 163, 74, 0.1)"
              />
            )}
            <Transformer ref={transformerRef} rotateEnabled={false} />
          </Layer>
        </Stage>
      </div>

      {!image && (
        <p className="text-center text-xs text-zinc-400">等待加载款式图...</p>
      )}
    </div>
  );
}
