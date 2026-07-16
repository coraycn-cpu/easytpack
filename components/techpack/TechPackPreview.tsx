import type { TechPackProject } from "@/types/project";
import { isSetTarget } from "@/lib/ai/garment-scope";
import { formatDate, WORKFLOW_LABELS } from "@/lib/project/progress";

type TechPackPreviewProps = {
  project: TechPackProject;
  annotatedImages?: Array<{ name: string; dataUrl: string }>;
  /** Studio 画布摆放合成的一张大图 */
  stageCompositeUrl?: string | null;
  printMode?: boolean;
};

export default function TechPackPreview({
  project,
  annotatedImages = [],
  stageCompositeUrl,
  printMode,
}: TechPackPreviewProps) {
  const styleNo = project.styleNo ?? project.id.slice(-8).toUpperCase();

  return (
    <article
      className={`mx-auto bg-white text-zinc-900 ${
        printMode ? "max-w-none p-0" : "max-w-4xl rounded-xl border border-zinc-200 p-8 shadow-sm"
      }`}
    >
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          Tech Pack · 工艺包
        </p>
        <h1 className="mt-2 text-2xl font-bold">{project.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">
          <span>品类：{project.intake.detectedCategory ?? "—"}</span>
          {project.intake.targetGarment?.label && (
            <span>
              目标款：{project.intake.targetGarment.label}
              {isSetTarget(project.intake) ? "（套装）" : ""}
            </span>
          )}
          <span>款号：{styleNo}</span>
          <span>状态：{WORKFLOW_LABELS[project.workflowStatus] ?? "草稿"}</span>
          <span>日期：{formatDate(project.updatedAt)}</span>
        </div>
        {project.intake.description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {project.intake.description}
          </p>
        )}
      </header>

      {stageCompositeUrl && (
        <section className="mt-8">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            画布拼接大图
          </h2>
          <p className="mb-3 text-[11px] text-zinc-400">
            含 Studio 摆放图；有数据时自动附带工艺 / 物料 / 尺寸（及备注）
          </p>
          <div className="overflow-auto rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stageCompositeUrl}
              alt="画布拼接大图"
              className="mx-auto max-h-[min(70vh,900px)] w-auto max-w-full object-contain"
            />
          </div>
        </section>
      )}

      {(annotatedImages.length > 0 || project.intake.imageDataUrl) && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {stageCompositeUrl ? "分图画板（含标注）" : "款式图（含标注）"}
          </h2>
          <div className="space-y-4">
            {annotatedImages.length > 0
              ? annotatedImages.map((img) => (
                  <div key={img.name}>
                    <p className="mb-1 text-xs font-medium text-zinc-500">{img.name}</p>
                    <div className="flex justify-center rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt={img.name} className="max-h-96 object-contain" />
                    </div>
                  </div>
                ))
              : project.intake.imageDataUrl && (
                  <div className="flex justify-center rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.intake.imageDataUrl}
                      alt={project.title}
                      className="max-h-96 object-contain"
                    />
                  </div>
                )}
          </div>
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
                <th className="py-2 pr-3">序号</th>
                <th className="py-2 pr-3">部位</th>
                <th className="py-2 pr-3">工艺描述</th>
                <th className="py-2 pr-3">针法</th>
                <th className="py-2">缝份</th>
              </tr>
            </thead>
            <tbody>
              {project.process_items.map((item, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 text-zinc-400">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium">{item.part}</td>
                  <td className="py-2 pr-3">{item.process}</td>
                  <td className="py-2 pr-3 text-zinc-500">{item.stitch ?? "—"}</td>
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
                <th className="py-2 pr-3">物料</th>
                <th className="py-2 pr-3">部件</th>
                <th className="py-2 pr-3">规格</th>
                <th className="py-2 pr-3">颜色</th>
                <th className="py-2 pr-3">用量</th>
                <th className="py-2">编码</th>
              </tr>
            </thead>
            <tbody>
              {project.bom_items.map((item, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 font-medium">{item.name}</td>
                  <td className="py-2 pr-3">{item.garmentPart ?? "—"}</td>
                  <td className="py-2 pr-3">{item.spec ?? "—"}</td>
                  <td className="py-2 pr-3">{item.color ?? "—"}</td>
                  <td className="py-2 pr-3">{item.usage ?? "—"}</td>
                  <td className="py-2">{item.code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {project.size_chart.rows.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            尺寸表（单位：cm）
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="py-2 pr-3">部位</th>
                <th className="py-2 pr-3">量法</th>
                {project.size_chart.sizes.map((s) => (
                  <th key={s} className="px-2 py-2">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {project.size_chart.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 font-medium">{row.part}</td>
                  <td className="py-2 pr-3 text-zinc-500">{row.method}</td>
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
