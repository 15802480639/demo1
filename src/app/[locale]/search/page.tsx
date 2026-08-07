'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 12;
const SORTS = [
  { value: 'new', label: { ko: '최신순', zh: '最新', en: 'Newest' } },
  { value: 'priceAsc', label: { ko: '가격 낮은순', zh: '价格升序', en: 'Price ↑' } },
  { value: 'priceDesc', label: { ko: '가격 높은순', zh: '价格降序', en: 'Price ↓' } },
] as const;

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
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label[locale]}
            </option>
          ))}
        </select>
        <span className="ml-auto text-muted">
          {loading
            ? '…'
            : debounced
              ? `${total} ${locale === 'ko' ? '개의 결과' : 'results'}`
              : locale === 'ko' ? '검색어를 입력하세요' : 'Start typing to search'}
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
