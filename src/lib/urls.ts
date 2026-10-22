import { siteConfig } from '@/lib/site';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

/**
 * 站点 URL 构造器 —— 全站唯一真源。
 *
 * 记忆库踩过的最大坑：llms.txt 里手写 `${base}/products/${slug}`，
 * 漏了 locale 段，而真实路由是 `/{locale}/products/{slug}`，
 * 结果**给 AI 的每一条链接都是 404**，llms.txt 价值归零。
 * 所以：站内所有对外 URL 一律走这里，禁止再手拼。
 */

export const baseUrl = (): string => siteConfig.url.replace(/\/$/, '');

/** 首页 */
export const urlHome = (locale: Locale = defaultLocale) => `${baseUrl()}/${locale}`;

/** 商品详情 */
export const urlProduct = (slug: string, locale: Locale = defaultLocale) =>
  `${baseUrl()}/${locale}/products/${slug}`;

/** 商品列表（可带筛选参数） */
export const urlProducts = (
  locale: Locale = defaultLocale,
  params?: Record<string, string | number | undefined | null>
) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && String(v).length > 0) q.set(k, String(v));
  }
  const s = q.toString();
  return `${baseUrl()}/${locale}/products${s ? `?${s}` : ''}`;
};

/** 分类（用真实存在的查询参数，不臆造路由） */
export const urlCategory = (slug: string, locale: Locale = defaultLocale) =>
  urlProducts(locale, { cat: slug });

/** 品牌 */
export const urlBrand = (slug: string, locale: Locale = defaultLocale) =>
  urlProducts(locale, { brand: slug });

/** 性别筛选 */
export const urlGender = (gender: string, locale: Locale = defaultLocale) =>
  urlProducts(locale, { gender });

/** FAQ */
export const urlFaq = (locale: Locale = defaultLocale) => `${baseUrl()}/${locale}/faq`;

/** 品牌墙 */
export const urlBrands = (locale: Locale = defaultLocale) => `${baseUrl()}/${locale}/brands`;

/** 信息页（隐私/条款/配送/退换/联系） */
export const urlInfo = (slug: string, locale: Locale = defaultLocale) =>
  `${baseUrl()}/${locale}/info/${slug}`;

/** 搜索 */
export const urlSearch = (locale: Locale = defaultLocale) =>
  `${baseUrl()}/${locale}/search`;

/**
 * 校验一个 URL 是否是站内真实可访问地址（防御性检查）。
 * 用于 llms.txt 生成时自检：任何不通过的都降级为不带链接的纯文本条目，
 * 宁可不给链接，也不能给 AI 一个 404。
 */
export function isValidInternalUrl(url: string): boolean {
  if (!url.startsWith(`${baseUrl()}/`)) return false;
  // 必须以 /{locale} 开头，且 locale 合法
  const rest = url.slice(baseUrl().length + 1).split(/[?#]/)[0];
  const seg = rest.split('/')[0];
  return locales.includes(seg as Locale);
}