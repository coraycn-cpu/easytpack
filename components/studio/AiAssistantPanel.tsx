"use client";

type AiAssistantPanelProps = {
  loading: boolean;
  message: string | null;
  tip: string | null;
  onGenerateSize: () => void;
  onEnhanceAll: () => void;
  onExplain: () => void;
};

export default function AiAssistantPanel({
  loading,
  message,
  tip,
  onGenerateSize,
  onEnhanceAll,
  onExplain,
}: AiAssistantPanelProps) {
  return (
    <div className="bg-[#eff6ff] p-2">
      <p className="mb-2 px-1 text-[10px] text-[#64748b]">
        智能标注已移至顶部工具栏 · 此处可生成尺码与补全工艺
      </p>
      <div className="grid grid-cols-1 gap-1">
        <AiActionButton loading={loading} onClick={onGenerateSize} title="生成尺码" primary />
        <AiActionButton loading={loading} onClick={onEnhanceAll} title="一键补全" />
        <AiActionButton loading={loading} onClick={onExplain} title="款式评语" />
      </div>

      {tip && (
        <div className="mt-2 border border-[#bfdbfe] bg-white px-2 py-1.5 text-[10px] leading-relaxed text-[#334155]">
          {tip}
        </div>
      )}
      {message && (
        <p className="mt-1 text-[10px] font-medium text-[#2563eb]">{message}</p>
      )}
    </div>
  );
}

function AiActionButton({
  title,
  onClick,
  loading,
  primary,
}: {
  title: string;
  onClick: () => void;
  loading: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`border px-2 py-2 text-left text-[10px] font-medium transition disabled:opacity-50 ${
        primary
          ? "border-[#2563eb] bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          : "border-[#bfdbfe] bg-white text-[#1e293b] hover:bg-[#dbeafe]"
      }`}
    >
      {loading ? "处理中…" : title}
    </button>
  );
}
