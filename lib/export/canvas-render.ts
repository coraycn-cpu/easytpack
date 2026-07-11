import type { Artboard, Annotation } from "@/types/project";
import type { ProcessItem } from "@/types/process";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import { computeSequenceBadges } from "@/lib/canvas/sequence-badges";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import { computeImageFit } from "@/lib/canvas/fit";
import { migrateArtboardHotspots } from "@/lib/project/hotspots";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
        if (a.linkedProcessIds?.length) ctx.setLineDash([6, 3]);
        ctx.fillStyle = `${c}33`;
        ctx.fillRect(a.x, a.y, a.width, a.height);
        ctx.strokeRect(a.x, a.y, a.width, a.height);
        ctx.setLineDash([]);
        const label = a.text;
        if (label) {
          ctx.fillStyle = a.linkedProcessIds?.length ? "#1d4ed8" : c;
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(label, a.x + 4, a.y > 16 ? a.y - 6 : a.y + 16);
        }
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

function drawSequenceBadges(
  ctx: CanvasRenderingContext2D,
  processItems: ProcessItem[],
  annotations: Annotation[],
) {
  const badges = computeSequenceBadges(processItems, annotations);
  for (const b of badges) {
    ctx.beginPath();
    ctx.arc(b.x + 14, b.y + 14, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.label, b.x + 14, b.y + 19);
    ctx.textAlign = "left";
  }
}

export async function renderArtboardToDataUrl(
  artboard: Artboard,
  imageFallback?: string,
  processItems: ProcessItem[] = [],
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

  const ab = migrateArtboardHotspots(artboard);
  const anns = normalizeAnnotations(ab.annotations);
  anns.forEach((ann) => drawAnnotation(ctx, ann));
  drawSequenceBadges(ctx, processItems, anns);

  return canvas.toDataURL("image/png");
}

export async function renderAllArtboards(
  artboards: Artboard[],
  imageFallback?: string,
  processItems: ProcessItem[] = [],
): Promise<Array<{ name: string; dataUrl: string }>> {
  const results: Array<{ name: string; dataUrl: string }> = [];
  for (const ab of artboards) {
    const dataUrl = await renderArtboardToDataUrl(ab, imageFallback, processItems);
    if (dataUrl) results.push({ name: ab.name, dataUrl });
  }
  return results;
}
