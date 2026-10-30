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

/**
 * 商品详情 —— **站内相对路径**（不带域名）。
 *
 * ⚠️ 为什么聊天里的商品链接要用相对路径而不是 urlProduct()？
 *   2026-10-30 实测踩坑：对外域名 www.mk.golf 的 DNS 指向一台已下线的韩国主机
 *   （27.102.137.133），源站又只有 80 端口没有 443 → 写死的
 *   `https://www.mk.golf/zh/products/xxx` 一点就是 ERR_QUIC_PROTOCOL_ERROR，
 *   客服/访客完全打不开商品页。
 *   用相对路径 `/zh/products/xxx` 则自动跟随当前访问的主机，
 *   无论用户是走域名、IP 还是别的入口，点开都是当前站的同一个商品页。
 *
 *   ⚠️ 仅用于「站内跳转按钮」。SEO 的 canonical / sitemap / llms.txt
 *      仍必须用绝对 URL（urlProduct），相对路径给搜索引擎是不合格的。
 */
export const urlProductPath = (slug: string, locale: Locale = defaultLocale) =>
  `/${locale}/products/${slug}`;

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

/** 分类（旧地址：查询参数形式，保留不失效） */
export const urlCategory = (slug: string, locale: Locale = defaultLocale) =>
  urlProducts(locale, { cat: slug });

/**
 * 分类（新地址：独立路径，支持多级）
 * 例：urlCategoryPath(['women','tops'], 'ko') → https://site/ko/c/women/tops
 *
 * ⚠️ 3 级分类用独立路径，SEO 权重集中在这里；
 * 老的 ?cat= 地址保留（不删），由分类页做跳转/规范链接。
 *
 * ⚠️ slug 必须是**原始未编码**形式（如韩文「테스트-카테고리」）。
 * Next.js 路由 params.path 传进来时已解码，若这里再 encodeURIComponent
 * 会造成「生成链接的编码 ≠ 实际路由解码值」的错位（实测韩文 slug 404）。
 * 浏览器/HTTP 会在发送时自动编码非 ASCII，所以直接拼接原始 slug 是正确做法。
 */
export const urlCategoryPath = (
  path: string[],
  locale: Locale = defaultLocale,
) => {
  const segs = path
    .filter(Boolean)
    .map((s) => encodeURI(decodeURIComponent(s)));
  return `${baseUrl()}/${locale}/c/${segs.join('/')}`;
};

/** 分类页（旧参数地址 → 新路径地址），用于 canonical / 跳转 */
export const urlCategoryLegacy = (slug: string, locale: Locale = defaultLocale) =>
  urlCategory(slug, locale);

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