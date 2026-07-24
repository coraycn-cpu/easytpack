"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  memberDisplayName,
  parseUserPlan,
  planLabel,
  type UserPlan,
} from "@/lib/ai/plan-display";

type StudioAccountChipProps = {
  email: string;
  authBusy?: boolean;
  onSignOut: () => void;
};

type AccountSummary = {
  used: number;
  limit: number;
  plan: UserPlan;
  paused: boolean;
};

/**
 * 画布右上角账号入口：一行摘要（名 / 级别 / AI 额度），点开看详情。
 * 团队能力尚未开放，详情里如实写「个人」。
 */
export default function StudioAccountChip({
  email,
  authBusy,
  onSignOut,
}: StudioAccountChipProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const name = memberDisplayName(email);
  const level = planLabel(summary?.plan ?? "free");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/usage?page=1&pageSize=1");
      if (!res.ok) {
        setSummary(null);
        return;
      }
      const data = (await res.json()) as {
        used?: number;
        limit?: number;
        plan?: string;
        paused?: boolean;
      };
      setSummary({
        used: Math.max(0, Math.floor(Number(data.used) || 0)),
        limit: Math.max(0, Math.floor(Number(data.limit) || 0)),
        plan: parseUserPlan(data.plan),
        paused: Boolean(data.paused),
      });
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, load]);

  const remaining =
    summary && summary.limit > 0
      ? Math.max(0, summary.limit - summary.used)
      : null;

  const quotaText = loading
    ? "AI …"
    : summary?.paused
      ? "AI 暂停"
      : summary
        ? `AI ${remaining}/${summary.limit}`
        : "AI —";

  const quotaDetail = loading
    ? "读取中…"
    : summary?.paused
      ? "本月额度已暂停"
      : summary
        ? `已用 ${summary.used} / 共 ${summary.limit}（还剩 ${remaining}）`
        : "暂无法读取";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[15rem] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-left hover:bg-slate-50 sm:max-w-[18rem]"
        title="账号信息"
        aria-expanded={open}
      >
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
          {level}
        </span>
        <span className="min-w-0 truncate text-[11px] font-medium text-slate-700">
          {name}
        </span>
        <span
          className={`shrink-0 text-[11px] tabular-nums ${
            summary?.paused
              ? "text-amber-700"
              : remaining !== null && remaining <= 20
                ? "text-rose-600"
                : "text-slate-500"
          }`}
        >
          {quotaText}
        </span>
        <span className="shrink-0 text-[10px] text-slate-400">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="truncate text-xs font-semibold text-slate-800">
              {name}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">{email}</p>
          </div>
          <dl className="space-y-2 px-3 py-2.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">级别</dt>
              <dd className="font-medium text-slate-700">{level}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">AI 额度</dt>
              <dd className="text-right font-medium tabular-nums text-slate-700">
                {quotaDetail}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">团队</dt>
              <dd className="font-medium text-slate-700">个人</dd>
            </div>
          </dl>
          <div className="flex border-t border-slate-100">
            <Link
              href="/account"
              className="flex-1 px-3 py-2 text-center text-[11px] font-medium text-blue-600 hover:bg-blue-50"
              onClick={() => setOpen(false)}
            >
              用户中心
            </Link>
            <button
              type="button"
              disabled={authBusy}
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex-1 border-l border-slate-100 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              退出
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
