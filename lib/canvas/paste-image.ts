import {
  compressImageDataUrlForAi,
  MAX_DATA_URL_LEN,
} from "@/lib/ai/image-for-request";
import { fileToDataUrl } from "@/lib/project/storage";

export function readImageDataUrlFromFile(file: File): Promise<string> {
  return fileToDataUrl(file);
}

export async function readImageDataUrlFromClipboard(
  e: ClipboardEvent,
): Promise<string | null> {
  const items = e.clipboardData?.items;
  if (!items) return null;

  for (const item of items) {
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    return readImageDataUrlFromFile(file);
  }
  return null;
}

/** 压缩过大的 data URL，便于 localStorage 保存 */
export async function prepareImageDataUrlForCanvas(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  if (dataUrl.length <= MAX_DATA_URL_LEN) return dataUrl;
  const compressed = await compressImageDataUrlForAi(dataUrl);
  return compressed ?? dataUrl;
}

export function nextPasteArtboardName(artboards: Array<{ name: string }>): string {
  const pasteBoards = artboards.filter((a) => a.name === "贴图" || a.name.startsWith("贴图 "));
  if (pasteBoards.length === 0) return "贴图";
  return `贴图 ${pasteBoards.length + 1}`;
}
