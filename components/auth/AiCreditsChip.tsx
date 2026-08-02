"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  AI_QUOTA_CHANGED_EVENT,
  type AiQuotaChangedDetail,
} from "@/lib/ai/quota-client";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type QuotaSummary = {
  used: number;
  limit: number;
  paused?: boolean;
};

/**
 * 顶栏 AI 额度胶囊（仅展示；点进去用户中心）
 */
export default function AiCreditsChip() {
  const { t } = useLocale();
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<QuotaSummary | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSummary(null);
      setReady(true);
      return;
    }
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setSummary(null);
        setReady(true);
        return;
      }
      const res = await fetch("/api/account/usage?page=1&pageSize=1", {
        credentials: "include",
      });
      if (!res.ok) {
        setReady(true);
        return;
      }
      const json = (await res.json()) as {
        used?: number;
        limit?: number;
        paused?: boolean;
      };
      setSummary({
        used: Math.max(0, Math.floor(Number(json.used) || 0)),
        limit: Math.max(0, Math.floor(Number(json.limit) || 0)),
        paused: Boolean(json.paused),
      });
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const onQuota = (e: Event) => {
      const detail = (e as CustomEvent<AiQuotaChangedDetail>).detail;
      if (
        detail &&
        typeof detail.used === "number" &&
        typeof detail.limit === "number"
      ) {
        setSummary({
          used: detail.used,
          limit: detail.limit,
        });
        return;
      }
      void load();
    };
    window.addEventListener(AI_QUOTA_CHANGED_EVENT, onQuota);
    return () => window.removeEventListener(AI_QUOTA_CHANGED_EVENT, onQuota);
  }, [load]);

  if (!ready || !summary || summary.limit <= 0) return null;

  const left = Math.max(0, summary.limit - summary.used);

  return (
    <Link
      href="/account"
      className="hidden items-center gap-1.5 rounded-full border border-brand-light bg-surface px-2.5 py-1 text-[11px] font-medium text-brand-dark hover:bg-brand-soft sm:inline-flex"
      title={
        summary.paused
          ? t("credits.pausedTitle")
          : t("credits.leftTitle", {
              n: left,
              used: summary.used,
              limit: summary.limit,
            })
      }
    >
      <span className="text-brand" aria-hidden>
        ✦
      </span>
      {summary.paused
        ? t("credits.paused")
        : t("credits.leftLabel", { n: left })}
    </Link>
  );
}
