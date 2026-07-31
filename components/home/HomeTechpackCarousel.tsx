"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HOME_TECHPACK_DEMO_TITLE,
  HOME_TECHPACK_SLIDES,
} from "@/lib/content/home-techpack-demo";

const INTERVAL_MS = 4200;

const EXPORT_HINT = "可导出 PDF / XLS / JPG 等格式，对接生产单数据";

/**
 * 首页左侧：工艺包 PDF 各页自动轮播展示。
 * 悬停暂停；点图放大；点圆点可跳转。
 */
export default function HomeTechpackCarousel() {
  const slides = HOME_TECHPACK_SLIDES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (paused || lightboxOpen || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, lightboxOpen, slides.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + slides.length) % slides.length);
      }
      if (e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % slides.length);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, slides.length]);

  const current = slides[index] ?? slides[0];
  const goPrev = () =>
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((i) => (i + 1) % slides.length);

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
      <p className="mb-2 text-[12px] font-medium leading-relaxed text-foreground">
        {EXPORT_HINT}
      </p>

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-muted">
          {HOME_TECHPACK_DEMO_TITLE}
        </p>
        <p className="shrink-0 text-[10px] text-muted">
          {index + 1}/{slides.length} · {current.label}
          <span className="ml-1.5 text-brand">点击可放大</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative block w-full cursor-zoom-in overflow-hidden rounded-[var(--radius-sm)] bg-white ring-1 ring-border transition hover:ring-brand"
        style={{ aspectRatio: "1200 / 849" }}
        aria-label={`放大查看：${current.alt}`}
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
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain object-top transition-opacity duration-700 ease-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </button>

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

      {mounted &&
        lightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-3 backdrop-blur-[2px] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="工艺包示例放大查看"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative flex max-h-full w-full max-w-5xl flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-white">
                <p className="min-w-0 truncate text-sm font-medium">
                  {HOME_TECHPACK_DEMO_TITLE}
                  <span className="ml-2 font-normal text-white/70">
                    {index + 1}/{slides.length} · {current.label}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="shrink-0 rounded-md bg-white/15 px-3 py-1.5 text-xs hover:bg-white/25"
                  aria-label="关闭"
                >
                  关闭
                </button>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-white shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.src}
                  alt={current.alt}
                  className="max-h-[min(82vh,900px)] w-full object-contain"
                />

                {slides.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/55 px-3 py-2 text-sm text-white hover:bg-slate-900/75"
                      aria-label="上一页"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/55 px-3 py-2 text-sm text-white hover:bg-slate-900/75"
                      aria-label="下一页"
                    >
                      ›
                    </button>
                  </>
                ) : null}
              </div>

              <p className="mt-2 text-center text-[11px] text-white/70">
                左右键翻页 · Esc 或点遮罩关闭 · {EXPORT_HINT}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
