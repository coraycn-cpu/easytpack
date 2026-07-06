"use client";

import { useCallback, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { Hotspot } from "@/types/process";

type StyleCanvasProps = {
  hotspots: Hotspot[];
  onHotspotsChange: (hotspots: Hotspot[]) => void;
};

function useLoadedImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const load = useCallback((url: string) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = url;
  }, []);

  return { image, load, clear: () => setImage(null), src };
}

function createId() {
  return `hs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function StyleCanvas({ hotspots, onHotspotsChange }: StyleCanvasProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { image, load, clear } = useLoadedImage(imageUrl);

  const stageWidth = 800;
  const stageHeight = 600;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    load(url);
    onHotspotsChange([]);
    setSelectedId(null);
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawMode || !image) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (e.target === stage) {
      setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      setSelectedId(null);
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
      setSelectedId(newHotspot.id);
    }

    setDraftRect(null);
    setDrawMode(false);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDrawMode(false);

    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    const node = stage.findOne(`#${id}`);
    if (node) {
      transformer.nodes([node]);
      transformer.getLayer()?.batchDraw();
    }
  };

  const updateHotspot = (id: string, attrs: Partial<Hotspot>) => {
    onHotspotsChange(
      hotspots.map((h) => (h.id === id ? { ...h, ...attrs } : h)),
    );
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    onHotspotsChange(hotspots.filter((h) => h.id !== selectedId));
    setSelectedId(null);
    transformerRef.current?.nodes([]);
  };

  const exportJson = () => {
    const data = {
      imageUrl,
      hotspots,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          导入款式图
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <button
          type="button"
          disabled={!image}
          onClick={() => setDrawMode(true)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {drawMode ? "拖拽框选部位..." : "添加热区"}
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={deleteSelected}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          删除选中
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          导出 JSON
        </button>
        {image && (
          <button
            type="button"
            onClick={() => {
              clear();
              setImageUrl(null);
              onHotspotsChange([]);
              setSelectedId(null);
            }}
            className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800"
          >
            清除
          </button>
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4">
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
                stroke="#2563eb"
                strokeWidth={2}
                fill="rgba(37, 99, 235, 0.15)"
                draggable
                onClick={() => handleSelect(hs.id)}
                onTap={() => handleSelect(hs.id)}
                onDragEnd={(e) => {
                  updateHotspot(hs.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  });
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
        <p className="text-center text-sm text-zinc-500">
          请先导入款式图，然后点击「添加热区」框选部位
        </p>
      )}
    </div>
  );
}
