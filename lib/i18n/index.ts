import { enMessages } from "@/lib/i18n/messages/en";
import { zhMessages } from "@/lib/i18n/messages/zh";
import type { Locale } from "@/lib/i18n/locale";
import { flattenDict, makeTranslator, type Dict, type TranslateFn } from "@/lib/i18n/translate";

const cache: Partial<Record<Locale, Dict>> = {};

export function getMessages(locale: Locale): Dict {
  if (!cache[locale]) {
    cache[locale] = flattenDict(
      (locale === "en" ? enMessages : zhMessages) as unknown as Record<
        string,
        unknown
      >,
    );
  }
  return cache[locale]!;
}

export function getTranslator(locale: Locale): TranslateFn {
  return makeTranslator(getMessages(locale), locale);
}

/** Server-safe translate without React */
export function tLocale(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  return getTranslator(locale)(key, params);
}
