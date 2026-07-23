import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { resolveImageRef, isIdbImageRef } from "@/lib/project/image-idb";
import type { TechPackProject } from "@/types/project";

export const SB_STORAGE_PREFIX = "sbstorage:";
export const STYLE_IMAGES_BUCKET = "style-images";

export function isSbStorageRef(value: string | undefined | null): boolean {
  return Boolean(value?.startsWith(SB_STORAGE_PREFIX));
}

export function toSbStorageRef(objectPath: string): string {
  return `${SB_STORAGE_PREFIX}${objectPath}`;
}

export function pathFromSbStorageRef(ref: string): string | null {
  if (!isSbStorageRef(ref)) return null;
  return ref.slice(SB_STORAGE_PREFIX.length);
}

/**
 * 把 Supabase Storage 的临时签名/公开 URL 还原成永久 sbstorage: 引用。
 * 避免把 1 小时过期的 https 写回本机或云端。
 */
export function trySbStorageRefFromUrl(url: string): string | null {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  try {
    const u = new URL(url);
    const markers = [
      `/storage/v1/object/sign/${STYLE_IMAGES_BUCKET}/`,
      `/storage/v1/object/public/${STYLE_IMAGES_BUCKET}/`,
      `/storage/v1/object/authenticated/${STYLE_IMAGES_BUCKET}/`,
    ];
    for (const marker of markers) {
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(
          u.pathname.slice(idx + marker.length),
        );
        if (path) return toSbStorageRef(path);
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 持久化用：尽量保留 data / idb / sbstorage，丢掉过期签名链 */
export function toDurableImageRef(
  url: string | undefined | null,
): string | undefined {
  if (!url) return undefined;
  if (isSbStorageRef(url) || isIdbImageRef(url) || url.startsWith("data:")) {
    return url;
  }
  const fromSigned = trySbStorageRefFromUrl(url);
  if (fromSigned) return fromSigned;
  // 已无法还原的 Storage 临时链，不要当有效图存
  if (url.includes("/storage/v1/object/")) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) {
    throw new Error("不是有效的图片数据");
  }
  const mime = m[1].toLowerCase();
  const b64 = m[2];
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  const ext =
    mime.includes("jpeg") || mime.includes("jpg")
      ? "jpg"
      : mime.includes("webp")
        ? "webp"
        : "png";
  return { blob: new Blob([bytes], { type: mime }), ext };
}

async function uploadOne(
  userId: string,
  projectId: string,
  slot: string,
  sourceUrl: string,
): Promise<string> {
  // 已是永久引用：绝不要先 resolve 成临时 https 再写回
  if (isSbStorageRef(sourceUrl)) return sourceUrl;

  const fromSigned = trySbStorageRefFromUrl(sourceUrl);
  if (fromSigned) return fromSigned;

  const resolved = (await resolveImageRef(sourceUrl)) ?? sourceUrl;
  if (isSbStorageRef(resolved)) return resolved;
  const resolvedSigned = trySbStorageRefFromUrl(resolved);
  if (resolvedSigned) return resolvedSigned;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    // 外部网络图：保留原地址（非本桶签名链）
    return resolved;
  }
  if (!resolved.startsWith("data:")) {
    throw new Error("无法识别的图片格式");
  }

  const { blob, ext } = dataUrlToBlob(resolved);
  const objectPath = `${userId}/${projectId}/${slot}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STYLE_IMAGES_BUCKET)
    .upload(objectPath, blob, {
      upsert: true,
      contentType: blob.type,
      cacheControl: "3600",
    });
  if (error) throw new Error(error.message);
  return toSbStorageRef(objectPath);
}

/** 把项目里的大图上传到云端文件夹，字段改成 sbstorage: 引用 */
export async function uploadProjectImagesForCloud(
  project: TechPackProject,
  userId: string,
): Promise<TechPackProject> {
  if (!isSupabaseConfigured()) return project;

  let intakeUrl = project.intake.imageDataUrl;
  if (
    intakeUrl &&
    (intakeUrl.startsWith("data:") ||
      isIdbImageRef(intakeUrl) ||
      isSbStorageRef(intakeUrl) ||
      Boolean(trySbStorageRefFromUrl(intakeUrl)))
  ) {
    try {
      intakeUrl = await uploadOne(userId, project.id, "intake", intakeUrl);
    } catch (err) {
      console.warn("[cloud-images] intake upload", err);
    }
  } else {
    intakeUrl = toDurableImageRef(intakeUrl);
  }

  const artboards = [];
  for (const ab of project.canvas_data.artboards) {
    let imageDataUrl = ab.imageDataUrl;
    if (
      imageDataUrl &&
      (imageDataUrl.startsWith("data:") ||
        isIdbImageRef(imageDataUrl) ||
        isSbStorageRef(imageDataUrl) ||
        Boolean(trySbStorageRefFromUrl(imageDataUrl)))
    ) {
      try {
        imageDataUrl = await uploadOne(
          userId,
          project.id,
          `ab_${ab.id}`,
          imageDataUrl,
        );
      } catch (err) {
        console.warn("[cloud-images] artboard upload", ab.id, err);
      }
    } else {
      imageDataUrl = toDurableImageRef(imageDataUrl);
    }
    artboards.push({ ...ab, imageDataUrl });
  }

  return {
    ...project,
    intake: { ...project.intake, imageDataUrl: intakeUrl },
    canvas_data: { ...project.canvas_data, artboards },
  };
}

/** 把 sbstorage: 引用换成可显示的临时链接（约 1 小时） */
export async function resolveSbStorageRef(
  ref: string,
): Promise<string | undefined> {
  const path = pathFromSbStorageRef(ref);
  if (!path) return undefined;
  if (!isSupabaseConfigured()) return undefined;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(STYLE_IMAGES_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) return undefined;
    return data.signedUrl;
  } catch {
    return undefined;
  }
}
