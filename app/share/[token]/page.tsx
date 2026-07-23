"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ShareSnapshot } from "@/lib/share/snapshot";

type SharePayload = {
  id: string;
  title: string;
  snapshot: ShareSnapshot;
  createdAt: string;
};

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
        const json = (await res.json()) as SharePayload & { error?: string };
        if (!res.ok) throw new Error(json.error || "无法打开分享");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "无法打开分享");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载分享…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-4">
        <p className="text-sm text-zinc-600">{error || "分享不存在"}</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          回到首页
        </Link>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              EasytPack 只读分享
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">{data.title}</h1>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-800">
            打开 EasytPack
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          {s.note}
        </p>

        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
          <p className="text-xs text-zinc-500">
            {[s.category, s.targetGarmentLabel, s.workflowLabel]
              .filter(Boolean)
              .join(" · ") || "未分类"}
          </p>
          {s.artboardNames?.length ? (
            <p className="mt-1 text-[11px] text-zinc-400">
              画板：{s.artboardNames.join("、")}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">工艺</h2>
          {s.process_items.length === 0 ? (
            <p className="mt-2 text-[11px] text-zinc-400">暂无工艺行</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {s.process_items.map((row, i) => (
                <li key={row.id ?? i} className="py-2 text-[12px] text-zinc-700">
                  <span className="font-medium">{row.part || "部位"}</span>
                  <span className="text-zinc-400"> · </span>
                  {row.process || "—"}
                  {row.seam_allowance ? (
                    <span className="text-zinc-400">
                      {" "}
                      · 止口 {row.seam_allowance}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">物料</h2>
          {s.bom_items.length === 0 ? (
            <p className="mt-2 text-[11px] text-zinc-400">暂无物料</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {s.bom_items.map((row, i) => (
                <li key={i} className="py-2 text-[12px] text-zinc-700">
                  <span className="font-medium">{row.name || "物料"}</span>
                  <span className="text-zinc-400">
                    {" "}
                    · {[row.spec, row.color, row.usage].filter(Boolean).join(" / ") ||
                      "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">尺寸</h2>
          <p className="mt-1 text-[11px] text-zinc-400">
            样衣码 {s.size_chart.sampleSize || "—"} · 尺码{" "}
            {(s.size_chart.sizes ?? []).join(" / ") || "—"}
          </p>
          {(s.size_chart.rows ?? []).length === 0 ? (
            <p className="mt-2 text-[11px] text-zinc-400">暂无尺寸行</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-500">
                    <th className="py-1.5 pr-3 font-medium">部位</th>
                    {(s.size_chart.sizes ?? []).map((sz) => (
                      <th key={sz} className="px-2 py-1.5 font-medium">
                        {sz}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(s.size_chart.rows ?? []).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-50 text-zinc-700">
                      <td className="py-1.5 pr-3">{row.part}</td>
                      {(s.size_chart.sizes ?? []).map((sz) => (
                        <td key={sz} className="px-2 py-1.5 tabular-nums">
                          {row.values?.[sz] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {s.style_review ? (
          <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
            <h2 className="text-sm font-semibold text-zinc-800">评语</h2>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-700">
              {s.style_review}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
