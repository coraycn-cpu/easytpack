"use client";

import type { ReactNode } from "react";

type DataExpandShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** 页脚左侧附加操作（如 + 添加行） */
  footerLeft?: ReactNode;
};

/** 与尺寸「跳码 / 放码」一致的展开大面板壳：实时编辑，完成仅关闭 */
export default function DataExpandShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footerLeft,
}: DataExpandShellProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[min(92vh,900px)] w-full max-w-[min(960px,96vw)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">{children}</div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <div>{footerLeft}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
