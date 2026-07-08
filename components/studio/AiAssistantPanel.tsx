"use client";

type AiAssistantPanelProps = {
  loading: boolean;
  message: string | null;
  tip: string | null;
  onSmartAnnotate: () => void;
  onGenerateSize: () => void;
  onEnhanceAll: () => void;
  onExplain: () => void;
};

export default function AiAssistantPanel({
  loading,
  message,
  tip,
  onSmartAnnotate,
  onGenerateSize,
  onEnhanceAll,
  onExplain,
}: AiAssistantPanelProps) {
  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
          AI
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">版房助手</h2>
          <p className="text-xs text-zinc-500">
            不懂服装术语也没关系，AI 帮你补全专业人员需要的信息
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <AiActionButton
          loading={loading}
          onClick={onSmartAnnotate}
          title="智能标注款式图"
          desc="自动在图上标出领口、袖口等关键位置"
          primary
        />
        <AiActionButton
          loading={loading}
          onClick={onGenerateSize}
          title="AI 生成尺码表"
          desc="根据款式自动填写各尺码尺寸"
        />
        <AiActionButton
          loading={loading}
          onClick={onEnhanceAll}
          title="一键补全工艺包"
          desc="补全工艺说明、面辅料清单等缺失项"
        />
        <AiActionButton
          loading={loading}
          onClick={onExplain}
          title="通俗解释"
          desc="用大白话说明这份工艺包讲了什么"
        />
      </div>

      {tip && (
        <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-zinc-600">
          {tip}
        </div>
      )}
      {message && (
        <p className="mt-2 text-xs font-medium text-blue-700">{message}</p>
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
}: {
  title: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2.5 text-left transition disabled:opacity-50 ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-white text-zinc-800 hover:bg-blue-50 border border-blue-100"
      }`}
    >
      <p className="text-sm font-medium">{loading ? "处理中..." : title}</p>
      <p className={`text-xs ${primary ? "text-blue-100" : "text-zinc-500"}`}>{desc}</p>
    </button>
  );
}
