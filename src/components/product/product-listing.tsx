'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/i18n/config';
import type { Dict } from '@/i18n/dictionaries';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 12;
const SORT_VALUES = ['new', 'priceAsc', 'priceDesc'] as const;

export type BrandOption = {
  slug: string;
  name: string;
  nameZh?: string | null;
  count?: number;
};

export function ProductListing({
  products,
  total,
  page,
  sort: initialSort,
  locale,
  dict,
  brands = [],
  brand: activeBrand = '',
  baseQuery = '',
}: {
  products: Product[];
  total: number;
  page: number;
  sort: string;
  locale: Locale;
  dict: Dict;
  brands?: BrandOption[];
  brand?: string;
  baseQuery?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    const arr = [...products];
    if (sort === 'priceAsc') arr.sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') arr.sort((a, b) => b.price - a.price);
    return arr;
  }, [products, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const qs = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams(baseQuery.replace(/^\?/, ''));
    Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
    const s = params.toString();
    return s ? `/${locale}/products?${s}` : `/${locale}/products`;
  };

  const onSort = (v: string) => {
    setSort(v);
    router.replace(qs({ sort: v, page: 1 }));
  };

  // 品牌筛选走服务端（URL 参数），分页/数量才会跟着变
  const onBrand = (v: string) => {
    const params = new URLSearchParams(baseQuery.replace(/^\?/, ''));
    if (v && v !== 'all') params.set('brand', v);
    else params.delete('brand');
    params.delete('page');
    const s = params.toString();
    router.push(s ? `/${locale}/products?${s}` : `/${locale}/products`);
  };

  const countLabel = dict.common.itemCount.replace('{n}', String(total));
  const sortLabels: Record<string, string> = {
    new: dict.common.sortNewest,
    priceAsc: dict.common.sortPriceAsc,
    priceDesc: dict.common.sortPriceDesc,
  };

  return (
    <div>
      {/* filter bar —— 品牌下拉（服务端筛选）+ 排序 chip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-4 mb-8 text-sm">
        <span className="text-[11px] tracking-luxe text-muted">
          {dict.common.filter}
        </span>
        <select
          value={activeBrand || 'all'}
          onChange={(e) => onBrand(e.target.value)}
          className="border border-line bg-surface px-3 py-1.5 outline-none focus:border-accent transition-colors hover:border-ink/40"
        >
          <option value="all">
            {dict.common.brand}: {dict.common.all}
          </option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {locale === 'zh' && b.nameZh ? b.nameZh : b.name}
              {typeof b.count === 'number' ? ` (${b.count})` : ''}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5" role="group" aria-label={dict.common.sort}>
          {SORT_VALUES.map((v) => {
            const active = sort === v;
            return (
              <button
                key={v}
                onClick={() => onSort(v)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-xs border transition-all duration-200 active:scale-[0.97] ${
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {sortLabels[v]}
              </button>
            );
          })}
        </div>

        <span className="ml-auto text-xs text-muted tnum">{countLabel}</span>
      </div>

      {/* grid —— stagger 入场 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {sorted.map((p, i) => (
          <div
            key={p.slug}
            className="reveal"
            style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}
          >
            <ProductCard product={p} locale={locale} dict={dict} />
          </div>
        ))}
      </div>

      {/* 空状态：给得出路的提示，而不是一个破折号 */}
      {sorted.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-2xl text-ink mb-2">
            {dict.common.noProducts}
          </p>
          <p className="text-sm text-muted mb-6">
            {dict.common.noProductsHint}
          </p>
          <a href={`/${locale}/products`} className="btn-outline">
            {dict.common.viewAllProducts}
          </a>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => qs({ sort, page: p })}
      />
    </div>
  );
}
