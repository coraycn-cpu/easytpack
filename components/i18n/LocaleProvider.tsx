"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getTranslator } from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  htmlLang,
  normalizeLocale,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
} from "@/lib/i18n/locale";
import type { TranslateFn } from "@/lib/i18n/translate";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    document.documentElement.lang = htmlLang(stored);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    const loc = normalizeLocale(next);
    setLocaleState(loc);
    writeStoredLocale(loc);
    document.documentElement.lang = htmlLang(loc);
  }, []);

  const t = useMemo(() => getTranslator(locale), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  // Avoid flashing wrong language: still render children (SSR zh default)
  void ready;

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe for components that may render outside provider in edge cases */
export function useLocaleOptional(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    setLocale: () => undefined,
    t: getTranslator(locale),
  };
}
