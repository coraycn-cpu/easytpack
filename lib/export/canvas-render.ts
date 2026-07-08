import type { Artboard } from "@/types/project";
import type { Hotspot } from "@/types/process";
import type { Annotation } from "@/types/project";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import { computeImageFit } from "@/lib/canvas/fit";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawHotspot(ctx: CanvasRenderingContext2D, hs: Hotspot) {
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(hs.x, hs.y, hs.width, hs.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "#1d4ed8";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(hs.label, hs.x + 4, hs.y > 16 ? hs.y - 6 : hs.y + 16);
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  const a = normalizeAnnotations([ann])[0];
  const c = a.color ?? "#ef4444";
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = a.strokeWidth ?? 3;

  switch (a.type) {
    case "rect":
      if (a.width && a.height) {
        ctx.fillStyle = `${c}33`;
        ctx.fillRect(a.x, a.y, a.width, a.height);
        ctx.strokeRect(a.x, a.y, a.width, a.height);
      }
      break;
    case "circle": {
      const rx = (a.width ?? 40) / 2;
      const ry = (a.height ?? 40) / 2;
      ctx.beginPath();
      ctx.ellipse(a.x + rx, a.y + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = `${c}33`;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "arrow":
    case "dimension":
      if (a.x2 != null && a.y2 != null) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x2, a.y2);
        if (a.type === "dimension") ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        const angle = Math.atan2(a.y2 - a.y, a.x2 - a.x);
        const head = 12;
        ctx.beginPath();
        ctx.moveTo(a.x2, a.y2);
        ctx.lineTo(a.x2 - head * Math.cos(angle - 0.4), a.y2 - head * Math.sin(angle - 0.4));
        ctx.lineTo(a.x2 - head * Math.cos(angle + 0.4), a.y2 - head * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        if (a.text) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(a.text, a.x2 + 6, a.y2 - 4);
        }
      }
      break;
    case "text":
      if (a.text) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(a.text, a.x, a.y);
      }
      break;
    case "marker": {
      const num = a.markerIndex ?? 1;
      const label = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"][num - 1] ?? `${num}`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, a.x, a.y + 5);
      ctx.textAlign = "left";
      ctx.fillStyle = c;
      break;
    }
    case "freehand":
      if (a.points && a.points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(a.points[0], a.points[1]);
        for (let i = 2; i < a.points.length; i += 2) {
          ctx.lineTo(a.points[i], a.points[i + 1]);
        }
        ctx.stroke();
      }
      break;
  }
}

export async function renderArtboardToDataUrl(
  artboard: Artboard,
  imageFallback?: string,
): Promise<string | null> {
  const src = artboard.imageDataUrl ?? imageFallback;
  if (!src) return null;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const img = await loadImage(src);
  const fit = computeImageFit(img.naturalWidth, img.naturalHeight);
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(img, fit.x, fit.y, fit.width, fit.height);

  artboard.hotspots.forEach((hs) => drawHotspot(ctx, hs));
  normalizeAnnotations(artboard.annotations).forEach((ann) => drawAnnotation(ctx, ann));

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
