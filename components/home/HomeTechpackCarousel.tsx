"use client";

import { useEffect, useState } from "react";
import {
  HOME_TECHPACK_DEMO_TITLE,
  HOME_TECHPACK_SLIDES,
} from "@/lib/content/home-techpack-demo";

const INTERVAL_MS = 4200;

/**
 * 首页左侧：工艺包 PDF 各页自动轮播展示。
 * 悬停暂停；点圆点可跳转。
 */
export default function HomeTechpackCarousel() {
  const slides = HOME_TECHPACK_SLIDES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const current = slides[index] ?? slides[0];

  return (
    <div
      className="w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground">
          {HOME_TECHPACK_DEMO_TITLE}
        </p>
        <p className="shrink-0 text-[10px] text-muted">
          {index + 1}/{slides.length} · {current.label}
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-[var(--radius-sm)] bg-white ring-1 ring-border"
        style={{ aspectRatio: "1200 / 849" }}
      >
        {slides.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            width={1200}
            height={849}
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-contain object-top transition-opacity duration-700 ease-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`第 ${i + 1} 页：${slide.label}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? "w-5 bg-brand"
                : "w-1.5 bg-border hover:bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
