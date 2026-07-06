import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";

const features = [
  {
    title: "工艺画板",
    description: "导入款式图，框选部位热区，标注结构工艺位置",
    href: "/canvas",
    cta: "进入画板",
  },
  {
    title: "AI 调试台",
    description: "测试 Vercel AI Gateway / 通义 / 智谱 工艺生成效果",
    href: "/debug/ai",
    cta: "调试 AI",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-600">
            AI 辅助服装工艺包
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">
            EasytPack
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
            在画板上完成款式标注，由 AI 辅助生成工艺说明、BOM 与尺寸表
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-blue-600">
                {f.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.description}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                {f.cta} →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          <p className="font-medium text-zinc-700">部署后下一步</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>在 Vercel Settings → Environment Variables 填入 Supabase 和 AI Key</li>
            <li>在 Supabase SQL Editor 执行 <code className="text-xs">supabase/schema.sql</code></li>
            <li>打开 /debug/ai 测试 AI 工艺生成</li>
            <li>打开 /canvas 导入款式图并框选热区</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
