"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCloudSyncMode,
  setCloudSyncMode,
  subscribeCloudSyncMode,
  type CloudSyncMode,
} from "@/lib/project/sync-preference";
import { useEffect, useState } from "react";

type SyncPreferenceControlsProps = {
  onChanged?: (mode: CloudSyncMode, tip: string) => void;
  className?: string;
};

/** 自动 / 手动同步切换（本机记住） */
export default function SyncPreferenceControls({
  onChanged,
  className = "",
}: SyncPreferenceControlsProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<CloudSyncMode>("auto");

  useEffect(() => {
    setMode(getCloudSyncMode());
    return subscribeCloudSyncMode(setMode);
  }, []);

  const currentLabel =
    mode === "auto"
      ? t("projects.syncLabelAuto")
      : t("projects.syncLabelManual");

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] text-muted">{t("projects.syncMode")}</span>
      <div className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface">
        <button
          type="button"
          onClick={() => {
            setCloudSyncMode("auto");
            onChanged?.("auto", t("projects.syncAutoTip"));
          }}
          className={`px-2.5 py-1 text-[11px] font-medium ${
            mode === "auto"
              ? "bg-brand text-white"
              : "text-muted hover:bg-brand-soft hover:text-brand"
          }`}
        >
          {t("projects.syncAuto")}
        </button>
        <button
          type="button"
          onClick={() => {
            setCloudSyncMode("manual");
            onChanged?.("manual", t("projects.syncManualTip"));
          }}
          className={`px-2.5 py-1 text-[11px] font-medium ${
            mode === "manual"
              ? "bg-brand text-white"
              : "text-muted hover:bg-brand-soft hover:text-brand"
          }`}
        >
          {t("projects.syncManual")}
        </button>
      </div>
      <span className="text-[10px] text-muted">
        {t("projects.syncCurrent", { label: currentLabel })}
      </span>
    </div>
  );
}
