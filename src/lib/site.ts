import { defaultLocale, type Locale } from '@/i18n/config';

export const siteConfig = {
  // 品牌名（2026-10-20 更名：MKGOLF → J&D / 제이앤디）
  name: 'J&D',
  nameKo: '제이앤디',
  tagline: 'Premium Golfwear',

  // Logo 资源（public/brand/）
  logo: '/brand/jnd-logo.png', // 透明底黑字，浅色背景用
  logoWhite: '/brand/jnd-logo-white.png', // 透明底白字，深色背景用
  logoOg: '/brand/jnd-og.png', // 1200×630 社交分享图

  // Public site URL (used for canonical / OG / sitemap). Update to your domain.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mk.golf',

  // Default locale & supported locales
  defaultLocale: defaultLocale as Locale,
  locales: ['ko', 'zh', 'en'] as Locale[],

  // Currency — Korean Won (primary)
  currency: 'KRW',
  currencySymbol: '₩',

  // Social
  youtube: 'https://www.youtube.com/@zk2026-6',
  instagram: '#',
  // ⚠️ Kakao 链接不再硬编码：原值是参考店的 pf.kakao.com，会被写进
  // organizationJsonLd 的 sameAs（等于告诉搜索引擎「我和他是同一家」）。
  // 现统一由 getKakaoUrl() 从后台 SiteSetting 读取，未配置则为空。
  kakao: '',

  // Company info (footer)
  company: {
    name: 'J&D',
    ceo: '—',
    address: '—',
    email: 'cs@mk.golf',
    tel: '—',
    businessNo: '—',
  },
};

export type SiteConfig = typeof siteConfig;
