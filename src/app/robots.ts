import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

/**
 * robots.txt —— GEO 的第一道门。
 *
 * 默认**全量放行主流 AI 爬虫**（GPTBot / ChatGPT-User / ClaudeBot / PerplexityBot /
 * Google-Extended / Applebot / OAI-SearchBot 等）。只屏蔽后台、账户、购物车、结算与 API。
 * 任何一条 Allow 缺失，AI 引擎就抓不到你的商品内容 —— 这是记忆库里踩过的坑。
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/*/admin',
    '/*/account',
    '/*/cart',
    '/*/checkout',
    '/*/order',
    '/*/wishlist',
    '/api',
    // H5 客服台（内部工具，不带语言前缀）
    '/cs',
  ];

  const aiAgents = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Applebot',
    'Applebot-Extended',
    'CCBot',
    'Bingbot',
    'DuckDuckBot',
    'Amazonbot',
    'meta-externalagent',
    'cohere-ai',
    'YouBot',
  ];

  return {
    rules: [
      // AI 爬虫：全站放行
      ...aiAgents.map((userAgent) => ({ userAgent, allow: '/', disallow })),
      // 普通搜索引擎
      { userAgent: '*', allow: '/', disallow },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}