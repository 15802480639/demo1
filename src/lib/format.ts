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
