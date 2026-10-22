import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { getAllProductSlugs, getBrands } from '@/lib/services/product-service';
import { baseUrl, urlProduct, urlBrand } from '@/lib/urls';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();

  /**
   * 只列**可公开收录**的页面。
   * 旧版把 /cart /checkout /account /wishlist 也写进了 sitemap，
   * 而 robots 又 disallow 它们 —— 自相矛盾，会让搜索引擎降低整站信任度。已剔除。
   *
   * 另一处修复：所有 URL 统一走 @/lib/urls，**禁止手拼**。
   * 手拼极易漏掉 locale 段（上一版 llms.txt 的 100% 死链就是这么来的）。
   */
  const staticRoutes = [
    { path: '',priority: 1, freq: 'daily' as const },
    { path: '/products', priority: 0.9, freq: 'daily' as const },
    { path: '/faq', priority: 0.8, freq: 'weekly' as const },
    { path: '/brands', priority: 0.7, freq: 'weekly' as const },
    { path: '/events', priority: 0.6, freq: 'weekly' as const },
    { path: '/search', priority: 0.5, freq: 'weekly' as const },
    { path: '/info/privacy', priority: 0.3, freq: 'yearly' as const },
    { path: '/info/terms', priority: 0.3, freq: 'yearly' as const },
    { path: '/info/shipping', priority: 0.4, freq: 'monthly' as const },
    { path: '/info/returns', priority: 0.4, freq: 'monthly' as const },
    { path: '/info/faq', priority: 0.4, freq: 'monthly' as const },
    { path: '/info/contact', priority: 0.4, freq: 'monthly' as const },
  ];

  const [slugs, brands] = await Promise.all([getAllProductSlugs(), getBrands()]);
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const r of staticRoutes) {
      routes.push({
        url: withLocale(locale, r.path),
        lastModified: now,
        changeFrequency: r.freq,
        priority: r.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, withLocale(l, r.path)])
          ),
        },
      });
    }

    // 产品详情页：带完整 hreflang（记忆库坑：只写 canonical 不写 alternate 等于放弃多语种收录）
    for (const slug of slugs) {
      routes.push({
        url: urlProduct(slug, locale),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, urlProduct(slug, l)])
          ),
        },
      });
    }

    // 品牌页（真实路由是 ?brand=slug）
    for (const b of brands) {
      routes.push({
        url: urlBrand(b.slug, locale),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, urlBrand(b.slug, l)])
          ),
        },
      });
    }
  }

  return routes;
}

/** 拼带 locale 的路径（staticRoutes 用，不含 query） */
function withLocale(locale: string, path: string): string {
  const base = baseUrl();
  if (path === '') return `${base}/${locale}`;
  return `${base}/${locale}${path}`;
}