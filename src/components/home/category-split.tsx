'use client';

import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

export function CategorySplit() {
  const { locale, dict } = useLocale();
  const blocks = [
    {
      label: dict.home.shopWomen,
      href: `/${locale}/products?gender=women`,
      bg: 'linear-gradient(135deg, #efe9e0 0%, #e3d3c0 100%)',
      eyebrow: dict.home.collectionEyebrow,
      dark: false,
    },
    {
      label: dict.home.shopMen,
      href: `/${locale}/products?gender=men`,
      bg: 'linear-gradient(135deg, #2c3a2e 0%, #1a1714 100%)',
      eyebrow: 'J&D',
      dark: true,
    },
  ];

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-8 py-20 sm:py-24 grid sm:grid-cols-2 gap-5 sm:gap-6">
      {blocks.map((b) => (
        <Link
          key={b.label}
          href={b.href}
          className="group relative h-80 sm:h-[26rem] flex items-center overflow-hidden rounded-card"
          style={{ background: b.bg }}
        >
          {/* 装饰圆环：悬停时缓慢放大 */}
          <span
            className={`pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full border transition-transform duration-[1200ms] ease-out group-hover:scale-125 ${
              b.dark ? 'border-white/10' : 'border-ink/10'
            }`}
          />
          <span
            className={`pointer-events-none absolute -right-4 bottom-0 w-44 h-44 rounded-full border transition-transform duration-[1200ms] ease-out group-hover:scale-110 ${
              b.dark ? 'border-accent/30' : 'border-accent/40'
            }`}
          />

          <div
            className={`relative z-10 w-full px-10 sm:px-14 ${
              b.dark ? 'text-right' : 'text-left'
            }`}
          >
            <p
              className={`tracking-luxe text-[11px] mb-4 ${
                b.dark ? 'text-white/60' : 'text-ink/55'
              }`}
            >
              {b.eyebrow}
            </p>
            <h3
              className={`font-display text-4xl sm:text-5xl lg:text-6xl leading-tight transition-transform duration-500 ease-out group-hover:-translate-y-1 ${
                b.dark ? 'text-white' : 'text-ink'
              }`}
            >
              {b.label}
            </h3>
            <span
              className={`inline-flex items-center gap-2 mt-6 text-xs tracking-luxe border-b pb-1.5 transition-all duration-300 ${
                b.dark
                  ? 'text-accent border-accent/60 group-hover:border-accent'
                  : 'text-ink border-ink/40 group-hover:border-ink'
              }`}
            >
              {dict.home.shopCta}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
