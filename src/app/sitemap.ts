import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { locales } from '@/i18n/config';
import { getAllProductSlugs, getBrands } from '@/lib/services/product-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticRoutes = [
    '',
    '/products',
    '/brands',
    '/events',
    '/cart',
    '/checkout',
    '/account',
    '/wishlist',
    '/info/privacy',
    '/info/terms',
    '/info/shipping',
    '/info/returns',
    '/info/faq',
    '/info/contact',
  ];

  const [slugs, brands] = await Promise.all([getAllProductSlugs(), getBrands()]);

  const routes: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const r of staticRoutes) {
      routes.push({
        url: `${base}/${locale}${r}`,
        lastModified: new Date(),
        changeFrequency: r === '' ? 'daily' : 'weekly',
        priority: r === '' ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${base}/${l}${r}`]),
          ),
        },
      });
    }
    // product detail pages
    for (const slug of slugs) {
      routes.push({
        url: `${base}/${locale}/products/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
    // brand pages
    for (const b of brands) {
      routes.push({
        url: `${base}/${locale}/products?brand=${b.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }
  return routes;
}
