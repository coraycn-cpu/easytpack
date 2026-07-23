"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthUserBrief = {
  email: string | null;
};

/** 顶栏：未登录显示「登录」；已登录显示邮箱 + 退出 */
export default function AuthHeaderControls() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<AuthUserBrief | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = isSupabaseConfigured();
    setConfigured(ok);
    if (!ok) {
      setReady(true);
      return;
    }

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? null } : null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
      if (session?.user) {
        void import("@/lib/invite/claim-pending").then(({ claimPendingInviteAfterAuth }) =>
          claimPendingInviteAfterAuth(),
        );
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void import("@/lib/invite/claim-pending").then(({ claimPendingInviteAfterAuth }) =>
      claimPendingInviteAfterAuth(),
    );
  }, [user]);

  const handleSignOut = async () => {
    if (!configured || busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <span className="text-xs text-zinc-300">…</span>;
  }

  if (!configured) {
    return (
      <span
        className="hidden text-[11px] text-zinc-400 sm:inline"
        title="还没配置云端账号，可先本机使用"
      >
        本机模式
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/account"
          className="hidden max-w-[10rem] truncate text-[11px] text-zinc-500 hover:text-zinc-800 sm:inline"
          title="打开用户中心"
        >
          {user.email ?? "已登录"}
        </Link>
        <Link
          href="/account"
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 sm:hidden"
        >
          账号
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSignOut()}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy ? "退出中…" : "退出"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/login?next=${encodeURIComponent("/")}`}
        className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        登录
      </Link>
      <Link
        href={`/login?mode=register&next=${encodeURIComponent("/")}`}
        className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
      >
        注册
      </Link>
    </div>
  );
}
