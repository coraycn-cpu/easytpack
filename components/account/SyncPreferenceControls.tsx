"use client";

import {
  cloudSyncModeLabel,
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
  const [mode, setMode] = useState<CloudSyncMode>("auto");

  useEffect(() => {
    setMode(getCloudSyncMode());
    return subscribeCloudSyncMode(setMode);
  }, []);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] text-muted">同步方式</span>
      <div className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface">
        <button
          type="button"
          onClick={() => {
            setCloudSyncMode("auto");
            onChanged?.(
              "auto",
              "已改为自动同步：之后登录/保存会自动上传",
            );
          }}
          className={`px-2.5 py-1 text-[11px] font-medium ${
            mode === "auto"
              ? "bg-brand text-white"
              : "text-muted hover:bg-brand-soft hover:text-brand"
          }`}
        >
          自动
        </button>
        <button
          type="button"
          onClick={() => {
            setCloudSyncMode("manual");
            onChanged?.(
              "manual",
              "已改为手动同步：保存只留本机，需点同步才上传",
            );
          }}
          className={`px-2.5 py-1 text-[11px] font-medium ${
            mode === "manual"
              ? "bg-brand text-white"
              : "text-muted hover:bg-brand-soft hover:text-brand"
          }`}
        >
          手动
        </button>
      </div>
      <span className="text-[10px] text-muted">
        当前 {cloudSyncModeLabel(mode)}
      </span>
    </div>
  );
}
