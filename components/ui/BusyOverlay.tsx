"use client";

type BusyOverlayProps = {
  title: string;
  subtitle?: string;
  /** 不确定进度时用不确定条动画 */
  indeterminate?: boolean;
  /** 0–100，indeterminate 时可忽略 */
  progress?: number;
};

/** 通用全屏忙碌提示：登录、进入工作台等，避免用户以为没反应 */
export default function BusyOverlay({
  title,
  subtitle,
  indeterminate = true,
  progress = 28,
}: BusyOverlayProps) {
  const width = indeterminate
    ? undefined
    : `${Math.min(96, Math.max(8, progress))}%`;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-900/35 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pf-card mx-4 w-full max-w-sm px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-background">
          {indeterminate ? (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
          ) : (
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
              style={{ width }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
