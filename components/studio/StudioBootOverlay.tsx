"use client";

type StudioBootOverlayProps = {
  /** 有图的画板总数；0 表示还在读项目 */
  imageTotal?: number;
  /** 已解码张数 */
  imageLoaded?: number;
  /** 主文案 */
  title?: string;
};

/** 进入工作台时的加载提示（多图时显示进度） */
export default function StudioBootOverlay({
  imageTotal = 0,
  imageLoaded = 0,
  title,
}: StudioBootOverlayProps) {
  const hasImages = imageTotal > 0;
  const pct =
    hasImages && imageTotal > 0
      ? Math.min(96, Math.round((imageLoaded / imageTotal) * 100))
      : 18;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#f9fafb]/90 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {title ?? (hasImages ? "正在打开工作台…" : "正在加载项目…")}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              {hasImages
                ? imageTotal > 1
                  ? `款式图较多，正在准备画布（${imageLoaded}/${imageTotal}）`
                  : "正在准备画布图片…"
                : "请稍候，马上进入画布"}
            </p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
