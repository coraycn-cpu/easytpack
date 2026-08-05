export type Locale = "zh" | "en";

export const LOCALE_STORAGE_KEY = "easytpack:locale";

export const DEFAULT_LOCALE: Locale = "zh";

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : "zh";
}

export function htmlLang(locale: Locale): string {
  return locale === "en" ? "en" : "zh-CN";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
