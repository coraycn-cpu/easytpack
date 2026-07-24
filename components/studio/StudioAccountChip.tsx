"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  memberDisplayName,
  parseUserPlan,
  planLabel,
  type UserPlan,
} from "@/lib/ai/plan-display";
import { buildInviteRegisterUrl } from "@/lib/invite/constants";

type StudioAccountChipProps = {
  email: string;
  authBusy?: boolean;
  onSignOut: () => void;
  onTip?: (message: string) => void;
};

type AccountSummary = {
  used: number;
  limit: number;
  plan: UserPlan;
  paused: boolean;
};

/**
 * 画布右上角账号入口：摘要不挤；展开后进常用入口 + 复制邀请链接。
 */
export default function StudioAccountChip({
  email,
  authBusy,
  onSignOut,
  onTip,
}: StudioAccountChipProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);

  const name = memberDisplayName(email);
  const level = planLabel(summary?.plan ?? "free");

  const loadUsage = useCallback(async () => {
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

  const loadInvite = useCallback(async () => {
    try {
      const res = await fetch("/api/account/profile");
      if (!res.ok) {
        setInviteCode(null);
        return;
      }
      const data = (await res.json()) as { inviteCode?: string };
      setInviteCode(data.inviteCode?.trim() || null);
    } catch {
      setInviteCode(null);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    if (!open) return;
    void loadUsage();
    void loadInvite();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, loadUsage, loadInvite]);

  const remaining =
    summary && summary.limit > 0
      ? Math.max(0, summary.limit - summary.used)
      : null;

  const quotaLine = loading
    ? "AI 额度读取中…"
    : summary?.paused
      ? "AI 额度已暂停"
      : summary
        ? `AI 还剩 ${remaining} / ${summary.limit}`
        : "AI 额度暂不可用";

  const copyInvite = async () => {
    if (!inviteCode || copyBusy) return;
    setCopyBusy(true);
    const url = buildInviteRegisterUrl(inviteCode);
    try {
      await navigator.clipboard.writeText(url);
      onTip?.("邀请链接已复制，发给好友注册即可");
    } catch {
      onTip?.(`请手动复制：${url}`);
    } finally {
      setCopyBusy(false);
    }
  };

  const navItem =
    "block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[9.5rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50"
        title="账号与常用入口"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {level}
            </span>
            <span className="truncate text-xs font-semibold text-slate-800">
              {name}
            </span>
          </span>
          <span
            className={`mt-0.5 block truncate text-[11px] tabular-nums ${
              summary?.paused
                ? "text-amber-700"
                : remaining !== null && remaining <= 20
                  ? "text-rose-600"
                  : "text-slate-500"
            }`}
          >
            {quotaLine}
          </span>
        </span>
        <span className="shrink-0 text-[10px] text-slate-400">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-800">
              {name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{email}</p>
          </div>

          <dl className="space-y-2 border-b border-slate-100 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">级别</dt>
              <dd className="font-medium text-slate-700">{level}</dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="shrink-0 text-slate-400">AI 额度</dt>
              <dd className="text-right font-medium tabular-nums text-slate-700">
                {loading
                  ? "读取中…"
                  : summary?.paused
                    ? "本月已暂停"
                    : summary
                      ? `已用 ${summary.used} · 共 ${summary.limit}`
                      : "暂无法读取"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">团队</dt>
              <dd className="font-medium text-slate-700">个人</dd>
            </div>
          </dl>

          <div className="border-b border-slate-100 py-1">
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              常用入口
            </p>
            <Link
              href="/account"
              className={navItem}
              onClick={() => setOpen(false)}
            >
              用户中心
            </Link>
            <Link
              href="/projects"
              className={navItem}
              onClick={() => setOpen(false)}
            >
              我的项目
            </Link>
            <Link href="/" className={navItem} onClick={() => setOpen(false)}>
              回首页
            </Link>
          </div>

          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              邀请好友
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              复制注册链接发给好友，双方可得分。
            </p>
            <button
              type="button"
              disabled={!inviteCode || copyBusy}
              onClick={() => void copyInvite()}
              className="mt-2 w-full rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copyBusy
                ? "复制中…"
                : inviteCode
                  ? "一键复制邀请链接"
                  : "邀请链接加载中…"}
            </button>
          </div>

          <button
            type="button"
            disabled={authBusy}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full px-3 py-2.5 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            退出登录
          </button>
        </div>
      ) : null}
    </div>
  );
}
