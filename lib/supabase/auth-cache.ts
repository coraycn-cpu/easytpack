/**
 * 浏览器端 auth.getUser 短缓存：同一页短时间内多次「是否登录」只打一次 /user。
 * 不改变登录语义；登出/登录事件会清缓存。
 */

import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type CachedUser = {
  id: string;
  email: string | null;
};

const TTL_MS = 4_000;

let cache: { user: CachedUser | null; expiresAt: number } | null = null;
let inflight: Promise<CachedUser | null> | null = null;
let listenerBound = false;

function bindAuthListener() {
  if (listenerBound || typeof window === "undefined") return;
  if (!isSupabaseConfigured()) return;
  listenerBound = true;
  try {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((_event, session) => {
      // 用会话直接写入缓存，避免登录后 SIGNED_IN 把刚写入的缓存清掉又打 /user
      cache = {
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? null,
            }
          : null,
        expiresAt: Date.now() + TTL_MS,
      };
      inflight = null;
    });
  } catch {
    listenerBound = false;
  }
}

export function invalidateClientAuthCache(): void {
  cache = null;
  inflight = null;
}

/** 登录/注册刚成功时写入缓存，避免下一页立刻再打 /user */
export function seedClientAuthCache(
  user: { id: string; email?: string | null } | null,
): void {
  cache = {
    user: user
      ? { id: user.id, email: user.email ?? null }
      : null,
    expiresAt: Date.now() + TTL_MS,
  };
  inflight = null;
}

/** 当前用户 id；未登录返回 null。短时间重复调用会复用结果。 */
export async function getCachedAuthUserId(): Promise<string | null> {
  const user = await getCachedAuthUser();
  return user?.id ?? null;
}

export async function getCachedAuthUser(): Promise<CachedUser | null> {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;

  bindAuthListener();

  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.user;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      const user =
        !error && data.user
          ? { id: data.user.id, email: data.user.email ?? null }
          : null;
      cache = { user, expiresAt: Date.now() + TTL_MS };
      return user;
    } catch {
      cache = { user: null, expiresAt: Date.now() + TTL_MS };
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
