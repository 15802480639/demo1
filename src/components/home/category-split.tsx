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
      dark: false,
    },
    {
      label: dict.home.shopMen,
      href: `/${locale}/products?gender=men`,
      bg: 'linear-gradient(135deg, #2c3a2e 0%, #1a1714 100%)',
      dark: true,
    },
  ];

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-8 py-16 grid sm:grid-cols-2 gap-5">
      {blocks.map((b) => (
        <Link
          key={b.label}
          href={b.href}
          className="relative h-72 sm:h-96 flex items-center overflow-hidden group"
          style={{ background: b.bg }}
        >
          <div
            className={`absolute inset-0 flex items-center px-10 ${
              b.dark ? 'justify-end text-right' : 'justify-start text-left'
            }`}
          >
            <div>
              <p
                className={`tracking-luxe text-xs mb-3 ${
                  b.dark ? 'text-white/60' : 'text-ink/60'
                }`}
              >
                {b.dark ? 'MKGOLF' : 'COLLECTION'}
              </p>
              <h3
                className={`font-display text-4xl sm:text-6xl ${
                  b.dark ? 'text-white' : 'text-ink'
                }`}
              >
                {b.label}
              </h3>
              <span
                className={`inline-block mt-5 text-sm tracking-widest border-b pb-1 transition-colors ${
                  b.dark
                    ? 'text-accent border-accent'
                    : 'text-ink border-ink'
                }`}
              >
                SHOP →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
