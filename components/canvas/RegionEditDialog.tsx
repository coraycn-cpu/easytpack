"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  REGION_EDIT_CHIPS,
  REGION_EDIT_LABELS,
} from "@/lib/studio/region-edit-ux";

type RegionEditDialogProps = {
  open: boolean;
  artboardName?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
};

/** 选区确认后的提示词弹窗（独立于整图「修正」，不改原流程） */
export default function RegionEditDialog({
  open,
  artboardName,
  busy,
  onClose,
  onSubmit,
}: RegionEditDialogProps) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    requestAnimationFrame(() => ref.current?.focus());
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const appendChip = (chip: string) => {
    setText((cur) => (cur.trim() ? `${cur.trim()}；${chip}` : chip));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
      data-no-canvas-zoom
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {REGION_EDIT_LABELS.dialogTitle}
            {artboardName ? ` · ${artboardName}` : ""}
          </h3>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
          {REGION_EDIT_LABELS.dialogHint}
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REGION_EDIT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
              onClick={() => appendChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="必填：选区要改成什么样…"
          rows={4}
          disabled={busy}
          className="mb-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400 disabled:opacity-60"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            {REGION_EDIT_LABELS.cancel}
          </button>
          <button
            type="button"
            disabled={busy || !text.trim()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onSubmit(text.trim())}
          >
            {busy ? "重绘中…" : REGION_EDIT_LABELS.submit}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
