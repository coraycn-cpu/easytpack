"use client";

import { useEffect, useState } from "react";
import {
  cloudSyncModeLabel,
  getCloudSyncMode,
  setCloudSyncMode,
  subscribeCloudSyncMode,
  type CloudSyncMode,
} from "@/lib/project/sync-preference";

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
      <span className="text-[11px] text-zinc-600">同步方式</span>
      <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-white">
        <button
          type="button"
          onClick={() => {
            setCloudSyncMode("auto");
            onChanged?.(
              "auto",
              "已改为自动同步：之后登录/保存会自动上传",
            );
          }}
          className={`px-2.5 py-1 text-[11px] ${
            mode === "auto"
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-50"
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
          className={`px-2.5 py-1 text-[11px] ${
            mode === "manual"
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          手动
        </button>
      </div>
      <span className="text-[10px] text-zinc-400">
        当前 {cloudSyncModeLabel(mode)}
      </span>
    </div>
  );
}
