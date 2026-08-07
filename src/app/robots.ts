import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 后台、账户、购物车、结算、API 不收录（含各语言前缀）
      disallow: [
        '/*/admin',
        '/*/account',
        '/*/cart',
        '/*/checkout',
        '/api',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
