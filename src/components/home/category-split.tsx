'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

type NavCategory = {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  parentId: string | null;
  depth: number;
};

export function CategorySplit() {
  const { locale, dict } = useLocale();
  const [cats, setCats] = useState<NavCategory[]>([]);

  // 读取后台建的一级分类：客户建了什么分类，首页就展示什么
  useEffect(() => {
    let alive = true;
    fetch('/api/site-content')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && Array.isArray(d?.categories)) {
          setCats(d.categories.filter((c: NavCategory) => c.depth === 1));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 有分类 → 用分类；没有分类 → 回落男女性别入口（保证不会开天窗）
  const blocks = cats.length
    ? cats.slice(0, 4).map((c, i) => ({
        label: locale === 'zh' ? c.nameZh || c.name : c.name,
        href: `/${locale}/c/${encodeURIComponent(c.slug)}`,
        eyebrow: dict.home.collectionEyebrow,
        dark: i % 2 === 1,
      }))
    : [
        {
          label: dict.home.shopWomen,
          href: `/${locale}/products?gender=women`,
          eyebrow: dict.home.collectionEyebrow,
          dark: false,
        },
        {
          label: dict.home.shopMen,
          href: `/${locale}/products?gender=men`,
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
          style={{
            background: b.dark
              ? 'linear-gradient(135deg, #f0e9de 0%, #e6dccb 100%)'
              : 'linear-gradient(135deg, #fbf8f3 0%, #f0e8dc 100%)',
          }}
        >
          {/* 装饰圆环：悬停时缓慢放大 */}
          <span
            className={`pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full border transition-transform duration-[1200ms] ease-out group-hover:scale-125 ${
              b.dark ? 'border-accent/25' : 'border-ink/10'
            }`}
          />
          <span
            className="pointer-events-none absolute -right-4 bottom-0 w-44 h-44 rounded-full border transition-transform duration-[1200ms] ease-out group-hover:scale-110 border-accent/40"
          />

          <div
            className={`relative z-10 w-full px-10 sm:px-14 ${
              b.dark ? 'text-right' : 'text-left'
            }`}
          >
            <p className="tracking-luxe text-[11px] mb-4 text-ink/55">
              {b.eyebrow}
            </p>
            <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight transition-transform duration-500 ease-out group-hover:-translate-y-1 text-ink">
              {b.label}
            </h3>
            <span
              className={`inline-flex items-center gap-2 mt-6 text-xs tracking-luxe border-b pb-1.5 transition-all duration-300 ${
                b.dark
                  ? 'text-accent-strong border-accent/60 group-hover:border-accent-strong'
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
