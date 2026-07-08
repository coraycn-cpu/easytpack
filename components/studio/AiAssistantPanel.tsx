"use client";

type AiAssistantPanelProps = {
  loading: boolean;
  message: string | null;
  tip: string | null;
  onSmartAnnotate: () => void;
  onGenerateSize: () => void;
  onEnhanceAll: () => void;
  onExplain: () => void;
  compact?: boolean;
};

export default function AiAssistantPanel({
  loading,
  message,
  tip,
  onSmartAnnotate,
  onGenerateSize,
  onEnhanceAll,
  onExplain,
  compact,
}: AiAssistantPanelProps) {
  return (
    <div
      className={`rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 ${
        compact ? "p-2.5" : "p-4"
      }`}
    >
      <div className={`flex items-start gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-full bg-blue-600 text-white ${
            compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
          }`}
        >
          AI
        </div>
        <div>
          <h2 className={`font-semibold text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
            版房助手
          </h2>
          {!compact && (
            <p className="text-xs text-zinc-500">
              不懂服装术语也没关系，AI 帮你补全专业人员需要的信息
            </p>
          )}
        </div>
      </div>

      <div className={compact ? "grid grid-cols-2 gap-1.5" : "space-y-2"}>
        <AiActionButton
          loading={loading}
          onClick={onSmartAnnotate}
          title="智能标注"
          desc={compact ? "标关键位置" : "自动在图上标出领口、袖口等关键位置"}
          primary
          compact={compact}
        />
        <AiActionButton
          loading={loading}
          onClick={onGenerateSize}
          title="生成尺码"
          desc={compact ? "自动填尺寸" : "根据款式自动填写各尺码尺寸"}
          compact={compact}
        />
        <AiActionButton
          loading={loading}
          onClick={onEnhanceAll}
          title="一键补全"
          desc={compact ? "补工艺物料" : "补全工艺说明、面辅料清单等缺失项"}
          compact={compact}
        />
        <AiActionButton
          loading={loading}
          onClick={onExplain}
          title="通俗解释"
          desc={compact ? "大白话说明" : "用大白话说明这份工艺包讲了什么"}
          compact={compact}
        />
      </div>

      {tip && (
        <div
          className={`rounded-lg bg-white/80 text-zinc-600 leading-relaxed ${
            compact ? "mt-2 px-2 py-1.5 text-[10px] line-clamp-3" : "mt-3 px-3 py-2 text-xs"
          }`}
        >
          {tip}
        </div>
      )}
      {message && (
        <p className={`mt-1 font-medium text-blue-700 ${compact ? "text-[10px]" : "text-xs"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function AiActionButton({
  title,
  desc,
  onClick,
  loading,
  primary,
  compact,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`w-full rounded-lg text-left transition disabled:opacity-50 ${
        compact ? "px-2 py-1.5" : "px-3 py-2.5"
      } ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-blue-100 bg-white text-zinc-800 hover:bg-blue-50"
      }`}
    >
      <p className={`font-medium ${compact ? "text-[10px]" : "text-sm"}`}>
        {loading ? "处理中..." : title}
      </p>
      <p
        className={`${compact ? "text-[9px] line-clamp-1" : "text-xs"} ${
          primary ? "text-blue-100" : "text-zinc-500"
        }`}
      >
        {desc}
      </p>
    </button>
  );
}
