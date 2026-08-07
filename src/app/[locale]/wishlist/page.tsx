'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { useCart } from '@/lib/cart-store';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';

export default function WishlistPage() {
  const { locale, dict } = useLocale();
  const add = useCart((s) => s.add);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/wishlist');
    const data = await res.json();
    if (!res.ok || !data.items) {
      setNeedLogin(true);
      setItems([]);
    } else {
      setItems(data.items);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(slug: string) {
    setItems((s) => s.filter((p) => p.slug !== slug));
    await fetch(`/api/wishlist?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
  }
  function moveAll() {
    items.forEach((p) =>
      add({ slug: p.slug, name: p.name, brandCode: p.brandCode, price: p.price, image: p.image }),
    );
    setItems([]);
  }

  if (needLogin) {
    return (
      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-24 text-center">
        <h1 className="font-display text-4xl text-ink mb-4">{dict.nav.wishlist}</h1>
        <p className="text-muted mb-6">{locale === 'ko' ? '로그인이 필요합니다.' : 'Login required'}</p>
        <Link href={`/${locale}/login?redirect=/${locale}/wishlist`} className="btn-gold">
          {dict.nav.login}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl sm:text-6xl text-ink">{dict.nav.wishlist}</h1>
        {items.length > 0 && (
          <button onClick={moveAll} className="btn-outline text-sm">
            {locale === 'ko' ? '전체 담기' : 'Add all to cart'}
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-muted">…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">—</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((p) => (
            <div key={p.slug} className="relative">
              <ProductCard product={p} locale={locale} dict={dict} />
              <button
                onClick={() => remove(p.slug)}
                className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 text-ink hover:text-red-600 text-sm"
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
