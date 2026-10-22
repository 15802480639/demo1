import type { Locale } from '@/i18n/config';
import { localeTags } from '@/i18n/config';

/**
 * Format a price in Korean Won (KRW). KRW has no minor unit, so we drop decimals.
 * The symbol is always ₩; grouping follows the locale convention.
 */
export function formatPrice(amount: number, locale: Locale): string {
  const tag = localeTags[locale];
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale]).format(value);
}

export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeTags[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/** 商品显示名：中文页优先用后台录的中文名，没录则回落原名 */
export function productName(
  p: { name: string; nameZh?: string | null },
  locale: string,
): string {
  return locale === 'zh' && p.nameZh ? p.nameZh : p.name;
}
