export const locales = ['ko', 'zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  zh: '中文',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  ko: '🇰🇷',
  zh: '🇨🇳',
  en: '🇬🇧',
};

// BCP-47 tags used for Intl formatters
export const localeTags: Record<Locale, string> = {
  ko: 'ko-KR',
  zh: 'zh-CN',
  en: 'en-US',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
