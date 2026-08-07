'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/i18n/config';
import type { Dict } from '@/i18n/dictionaries';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 12;
const SORTS = [
  { value: 'new', label: { ko: '최신순', zh: '最新', en: 'Newest' } },
  { value: 'priceAsc', label: { ko: '가격 낮은순', zh: '价格升序', en: 'Price ↑' } },
  { value: 'priceDesc', label: { ko: '가격 높은순', zh: '价格降序', en: 'Price ↓' } },
] as const;

export function ProductListing({
  products,
  total,
  page,
  sort: initialSort,
  locale,
  dict,
  baseQuery = '',
}: {
  products: Product[];
  total: number;
  page: number;
  sort: string;
  locale: Locale;
  dict: Dict;
  baseQuery?: string;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState(initialSort);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brandCode))),
    [products],
  );

  const sorted = useMemo(() => {
    const arr = [...products];
    if (sort === 'priceAsc') arr.sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') arr.sort((a, b) => b.price - a.price);
    return arr;
  }, [products, sort]);

  const filtered = useMemo(
    () => (brand === 'all' ? sorted : sorted.filter((p) => p.brandCode === brand)),
    [sorted, brand],
  );

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

  return (
    <div>
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-4 border-y border-line py-4 mb-8 text-sm">
        <span className="text-muted">{dict.common.filter}</span>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
        >
          <option value="all">{dict.common.brand}: All</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label[locale]}
            </option>
          ))}
        </select>
        <span className="ml-auto text-muted">
          {filtered.length} / {total}
        </span>
      </div>

      {/* grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map((p) => (
          <ProductCard key={p.slug} product={p} locale={locale} dict={dict} />
        ))}
      </div>

      {filtered.length === 0 && <p className="text-center text-muted py-16">—</p>}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => qs({ sort, page: p })}
      />
    </div>
  );
}
