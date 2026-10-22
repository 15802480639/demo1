'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 12;
const SORT_VALUES = ['new', 'priceAsc', 'priceDesc'] as const;

export default function SearchPage() {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debounced, sort]);

  useEffect(() => {
    let active = true;
    if (!debounced) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const url = `/api/products?q=${encodeURIComponent(debounced)}&sort=${sort}&take=${PER_PAGE}&page=${page}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setResults(d.products ?? []);
        setTotal(d.total ?? (d.products ?? []).length);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const sortLabels: Record<string, string> = {
    new: dict.common.sortNewest,
    priceAsc: dict.common.sortPriceAsc,
    priceDesc: dict.common.sortPriceDesc,
  };
  const qs = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
    const s = params.toString();
    return s ? `/${locale}/search?${s}` : `/${locale}/search`;
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-6">
        {dict.common.search}
      </h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={dict.common.search + '...'}
        className="w-full border border-line bg-surface px-5 py-4 text-lg outline-none focus:border-accent transition-colors mb-4"
      />

      <div className="flex flex-wrap items-center gap-4 border-y border-line py-4 mb-8 text-sm">
        <span className="text-muted">{dict.common.filter}</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
        >
          {SORT_VALUES.map((v) => (
            <option key={v} value={v}>
              {sortLabels[v]}
            </option>
          ))}
        </select>
        <span className="ml-auto text-muted">
          {loading
            ? '…'
            : debounced
              ? dict.common.resultsCount.replace('{n}', String(total))
              : dict.common.searchHint}
        </span>
      </div>

      {results.length === 0 && !loading ? (
        <p className="text-muted text-center py-16">—</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {results.map((p) => (
            <ProductCard key={p.slug} product={p} locale={locale} dict={dict} />
          ))}
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
