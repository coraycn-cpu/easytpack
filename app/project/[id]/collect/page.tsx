"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * 互动问卷已并入 Studio 弹窗（一题一题，最多 5 问）。
 * 保留此路由以免旧链接失效。
 */
export default function CollectPageRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/project/${id}/studio?fullCollect=1`);
  }, [id, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
      正在进入工作台…
    </div>
  );
}
