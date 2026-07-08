import type { Artboard } from "@/types/project";
import type { Hotspot } from "@/types/process";
import type { Annotation } from "@/types/project";

const STAGE_W = 800;
const STAGE_H = 600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawHotspot(
  ctx: CanvasRenderingContext2D,
  hs: Hotspot,
  selected = false,
) {
  ctx.strokeStyle = selected ? "#1d4ed8" : "#2563eb";
  ctx.lineWidth = selected ? 3 : 2;
  ctx.fillStyle = "rgba(37, 99, 235, 0.12)";
  ctx.fillRect(hs.x, hs.y, hs.width, hs.height);
  ctx.strokeRect(hs.x, hs.y, hs.width, hs.height);

  ctx.fillStyle = "#1d4ed8";
  ctx.font = "12px sans-serif";
  const labelY = hs.y - 4 < 12 ? hs.y + 14 : hs.y - 4;
  ctx.fillText(hs.label, hs.x + 2, labelY);
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  ctx.strokeStyle = "#dc2626";
  ctx.fillStyle = "#dc2626";
  ctx.lineWidth = 2;

  if (ann.type === "arrow" && ann.x2 != null && ann.y2 != null) {
    ctx.beginPath();
    ctx.moveTo(ann.x, ann.y);
    ctx.lineTo(ann.x2, ann.y2);
    ctx.stroke();
    const angle = Math.atan2(ann.y2 - ann.y, ann.x2 - ann.x);
    const head = 10;
    ctx.beginPath();
    ctx.moveTo(ann.x2, ann.y2);
    ctx.lineTo(
      ann.x2 - head * Math.cos(angle - 0.4),
      ann.y2 - head * Math.sin(angle - 0.4),
    );
    ctx.lineTo(
      ann.x2 - head * Math.cos(angle + 0.4),
      ann.y2 - head * Math.sin(angle + 0.4),
    );
    ctx.closePath();
    ctx.fill();
  }

  if (ann.type === "label" && ann.text) {
    ctx.font = "13px sans-serif";
    ctx.fillText(ann.text, ann.x, ann.y);
  }
}

export async function renderArtboardToDataUrl(
  artboard: Artboard,
  imageFallback?: string,
): Promise<string | null> {
  const src = artboard.imageDataUrl ?? imageFallback;
  if (!src) return null;

  const canvas = document.createElement("canvas");
  canvas.width = STAGE_W;
  canvas.height = STAGE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const img = await loadImage(src);
  ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);

  artboard.hotspots.forEach((hs) => drawHotspot(ctx, hs));
  artboard.annotations.forEach((ann) => drawAnnotation(ctx, ann));

  return canvas.toDataURL("image/png");
}

export async function renderAllArtboards(
  artboards: Artboard[],
  imageFallback?: string,
): Promise<Array<{ name: string; dataUrl: string }>> {
  const results: Array<{ name: string; dataUrl: string }> = [];
  for (const ab of artboards) {
    const dataUrl = await renderArtboardToDataUrl(ab, imageFallback);
    if (dataUrl) results.push({ name: ab.name, dataUrl });
  }
  return results;
}
