import type { Locale } from "@/lib/i18n/locale";

export type Dict = Record<string, string>;

/** Flatten nested dict with dot keys */
export function flattenDict(
  input: Record<string, unknown>,
  prefix = "",
): Dict {
  const out: Dict = {};
  for (const [k, v] of Object.entries(input)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenDict(v as Record<string, unknown>, key));
    } else if (typeof v === "string") {
      out[key] = v;
    }
  }
  return out;
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name];
    return v == null ? `{${name}}` : String(v);
  });
}

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function makeTranslator(dict: Dict, locale: Locale): TranslateFn {
  return (key, params) => {
    const raw = dict[key];
    if (raw == null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] missing key: ${key} (${locale})`);
      }
      return key;
    }
    return interpolate(raw, params);
  };
}
