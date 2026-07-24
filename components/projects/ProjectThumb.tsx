"use client";

import { useEffect, useState } from "react";
import { resolveImageRef } from "@/lib/project/image-idb";

type ProjectThumbProps = {
  imageRef?: string;
  title: string;
  className?: string;
};

/** 相册卡片缩略图：异步解析 idb:/sbstorage: 等引用 */
export default function ProjectThumb({
  imageRef,
  title,
  className = "",
}: ProjectThumbProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    const raw = imageRef?.trim();
    if (!raw) {
      setFailed(true);
      return;
    }
    // data: / http(s) 可直接用
    if (
      raw.startsWith("data:") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("blob:")
    ) {
      setSrc(raw);
      return;
    }
    void resolveImageRef(raw).then((resolved) => {
      if (cancelled) return;
      if (resolved) setSrc(resolved);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [imageRef]);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-[11px] text-slate-400 ${className}`}
        aria-label={`${title} 无预览图`}
      >
        暂无图
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
