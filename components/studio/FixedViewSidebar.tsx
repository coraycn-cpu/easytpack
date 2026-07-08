"use client";

type FixedViewSidebarProps = {
  artboards: Array<{ id: string; name: string }>;
  activeArtboardId: string;
  onSwitchArtboard: (id: string) => void;
  onApplyHotspotTemplate: () => void;
  onReplaceImage: (dataUrl: string) => void;
};

export default function FixedViewSidebar({
  artboards,
  activeArtboardId,
  onSwitchArtboard,
  onApplyHotspotTemplate,
  onReplaceImage,
}: FixedViewSidebarProps) {
  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-[#cbd5e1] bg-white">
      <div className="border-b border-[#e2e8f0] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
          画板视图
        </p>
      </div>

      <div className="flex flex-col gap-0 border-b border-[#e2e8f0] p-2">
        {artboards.map((ab) => (
          <button
            key={ab.id}
            type="button"
            onClick={() => onSwitchArtboard(ab.id)}
            className={`border px-3 py-2 text-left text-xs font-medium ${
              ab.id === activeArtboardId
                ? "border-[#475569] bg-[#475569] text-white"
                : "border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
            } ${ab.id !== artboards[0]?.id ? "-mt-px" : ""}`}
          >
            {ab.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 p-2">
        <button
          type="button"
          onClick={onApplyHotspotTemplate}
          className="border border-[#cbd5e1] bg-white px-3 py-2 text-left text-[11px] text-[#2563eb] hover:bg-[#f1f5f9]"
        >
          应用热区模板
        </button>
        <label className="cursor-pointer border border-[#cbd5e1] bg-white px-3 py-2 text-[11px] text-[#64748b] hover:bg-[#f1f5f9]">
          更换图片
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onReplaceImage(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>
    </aside>
  );
}
