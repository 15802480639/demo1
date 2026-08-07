import { defaultLocale, type Locale } from '@/i18n/config';

export const siteConfig = {
  // Brand name (placeholder — replace with your brand)
  name: 'MKGOLF',
  nameKo: '엠케이골프',
  tagline: 'Premium Golfwear',

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
  kakao: 'https://pf.kakao.com/_MfjUn/chat',

  // Company info (footer)
  company: {
    name: 'MKGOLF Co., Ltd.',
    ceo: '—',
    address: '—',
    email: 'cs@mk.golf',
    tel: '—',
    businessNo: '—',
  },
};

export type SiteConfig = typeof siteConfig;
