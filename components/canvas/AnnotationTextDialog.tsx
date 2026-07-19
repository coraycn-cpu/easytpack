"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AnnotationTextDialogProps = {
  open: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  /** 多行文字用 textarea；尺寸数值用单行 */
  multiline?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/** 手动标注填字：与 Studio 一致的窄弹层 */
export default function AnnotationTextDialog({
  open,
  title,
  placeholder,
  initialValue = "",
  confirmLabel = "确定",
  multiline = true,
  onConfirm,
  onCancel,
}: AnnotationTextDialogProps) {
  const [value, setValue] = useState(initialValue);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    requestAnimationFrame(() => {
      const el = multiline ? areaRef.current : inputRef.current;
      el?.focus();
      el?.select();
    });
  }, [open, initialValue, multiline]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const submit = () => onConfirm(value);
  const fieldClass =
    "mt-3 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
      data-no-canvas-zoom
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ann-text-dialog-title"
        className="w-full max-w-[280px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="ann-text-dialog-title"
          className="text-sm font-semibold text-slate-800"
        >
          {title}
        </h2>
        {multiline ? (
          <textarea
            ref={areaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            className={`${fieldClass} resize-none leading-relaxed`}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            className={fieldClass}
          />
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
