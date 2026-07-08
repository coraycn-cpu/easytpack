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
    <aside className="flex w-48 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">画板视图</p>
        <p className="mt-0.5 text-[10px] text-slate-400">切换正面 / 背面 / 细节</p>
      </div>

      <div className="space-y-1 p-3">
        {artboards.map((ab) => {
          const active = ab.id === activeArtboardId;
          return (
            <button
              key={ab.id}
              type="button"
              onClick={() => onSwitchArtboard(ab.id)}
              className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {ab.name}
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-2 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onApplyHotspotTemplate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <span>⊞</span>
          应用热区模板
        </button>
        <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
          <span>🖼</span>
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
