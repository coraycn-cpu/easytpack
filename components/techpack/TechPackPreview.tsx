import type { TechPackProject } from "@/types/project";
import { formatDate } from "@/lib/project/progress";

type TechPackPreviewProps = {
  project: TechPackProject;
  printMode?: boolean;
};

export default function TechPackPreview({ project, printMode }: TechPackPreviewProps) {
  return (
    <article
      className={`mx-auto bg-white text-zinc-900 ${printMode ? "max-w-none p-0" : "max-w-4xl rounded-xl border border-zinc-200 p-8 shadow-sm"}`}
    >
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          Tech Pack · 工艺包
        </p>
        <h1 className="mt-2 text-2xl font-bold">{project.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">
          <span>品类：{project.intake.detectedCategory ?? "—"}</span>
          <span>款号：{project.id.slice(-8).toUpperCase()}</span>
          <span>日期：{formatDate(project.updatedAt)}</span>
        </div>
        {project.intake.description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {project.intake.description}
          </p>
        )}
      </header>

      {project.intake.imageDataUrl && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            款式图
          </h2>
          <div className="flex justify-center rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.intake.imageDataUrl}
              alt={project.title}
              className="max-h-96 object-contain"
            />
          </div>
          {project.canvas_data.hotspots.length > 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              标注部位：{project.canvas_data.hotspots.map((h) => h.label).join("、")}
            </p>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          结构工艺表
        </h2>
        {project.process_items.length === 0 ? (
          <p className="text-sm text-zinc-400">暂无工艺条目</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">序号</th>
                <th className="py-2 pr-4">部位</th>
                <th className="py-2 pr-4">工艺描述</th>
                <th className="py-2 pr-4">针法</th>
                <th className="py-2">缝份</th>
              </tr>
            </thead>
            <tbody>
              {project.process_items.map((item, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 text-zinc-400">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium">{item.part}</td>
                  <td className="py-2 pr-4">{item.process}</td>
                  <td className="py-2 pr-4 text-zinc-500">{item.stitch ?? "—"}</td>
                  <td className="py-2 text-zinc-500">{item.seam_allowance ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          面辅料清单 BOM
        </h2>
        {project.bom_items.length === 0 ? (
          <p className="text-sm text-zinc-400">暂无 BOM</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">物料</th>
                <th className="py-2 pr-4">规格</th>
                <th className="py-2 pr-4">颜色</th>
                <th className="py-2 pr-4">用量</th>
                <th className="py-2">供应商</th>
              </tr>
            </thead>
            <tbody>
              {project.bom_items.map((item, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 font-medium">{item.name}</td>
                  <td className="py-2 pr-4">{item.spec ?? "—"}</td>
                  <td className="py-2 pr-4">{item.color ?? "—"}</td>
                  <td className="py-2 pr-4">{item.usage ?? "—"}</td>
                  <td className="py-2">{item.supplier ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {project.size_chart.rows.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            尺寸表
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">部位</th>
                <th className="py-2 pr-4">量法</th>
                {project.size_chart.sizes.map((s) => (
                  <th key={s} className="py-2 px-2">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {project.size_chart.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 font-medium">{row.part}</td>
                  <td className="py-2 pr-4 text-zinc-500">{row.method}</td>
                  {project.size_chart.sizes.map((s) => (
                    <td key={s} className="px-2 py-2">
                      {row.values[s] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-10 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
        EasytPack 生成 · {formatDate(project.updatedAt)}
      </footer>
    </article>
  );
}
