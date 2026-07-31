import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * 旧登录地址兼容：统一跳到首页进站页（左右分栏已含登录/注册）。
 * 保留 mode / next / ref / error 查询参数，业务逻辑不变。
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const key of ["mode", "next", "ref", "error"] as const) {
    const raw = sp[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) qs.set(key, value);
  }
  const q = qs.toString();
  redirect(q ? `/?${q}` : "/");
}
