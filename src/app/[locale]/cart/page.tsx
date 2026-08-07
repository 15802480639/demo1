'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';
import { useCart, cartTotal } from '@/lib/cart-store';

export default function CartPage() {
  const { locale, dict } = useLocale();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = cartTotal(lines);

  // 实时库存校验（结算前提示超量）
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!lines.length) {
      setStockMap({});
      return;
    }
    const slugs = Array.from(new Set(lines.map((l) => l.slug))).join(',');
    fetch(`/api/products?slugs=${encodeURIComponent(slugs)}`)
      .then((r) => r.json())
      .then((d) => setStockMap(d.stock ?? {}))
      .catch(() => {});
  }, [lines]);

  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-8">
        {dict.nav.cart}
      </h1>

      {lines.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted mb-6">—</p>
          <Link href={`/${locale}/products`} className="btn-gold">
            {dict.nav.shop}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {lines.map((l) => (
            <div
              key={`${l.slug}-${l.size ?? ''}`}
              className="flex gap-4 items-center border-b border-line pb-6"
            >
              <div className="w-20 h-24 rounded overflow-hidden bg-surface-2 shrink-0">
                {l.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.image}
                    alt={l.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted">{l.brandCode}</p>
                <Link
                  href={`/${locale}/products/${l.slug}`}
                  className="text-ink hover:text-accent transition-colors truncate block"
                >
                  {l.name}
                </Link>
                {l.size && (
                  <p className="text-xs text-muted mt-0.5">
                    {dict.product.size}: {l.size}
                  </p>
                )}
                {(() => {
                  const stock = stockMap[l.slug];
                  if (typeof stock !== 'number' || l.qty <= stock) return null;
                  return (
                    <p className="text-xs text-red-600 mt-0.5">
                      {locale === 'ko'
                        ? `재고 ${stock}개 — 수량을 조절해 주세요`
                        : `Only ${stock} in stock`}
                    </p>
                  );
                })()}
                <p className="mt-1 text-sm">{formatPrice(l.price, locale)}</p>
              </div>
              <input
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) =>
                  setQty(l.slug, l.size, parseInt(e.target.value) || 1)
                }
                className="w-16 border border-line px-2 py-1 text-center outline-none focus:border-accent"
              />
              <button
                onClick={() => remove(l.slug, l.size)}
                className="text-muted hover:text-ink text-sm"
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
            <span className="text-muted">{dict.common.price}</span>
            <span className="font-display text-3xl text-ink">
              {formatPrice(total, locale)}
            </span>
          </div>

          <Link
            href={`/${locale}/checkout`}
            className="btn-gold w-full sm:w-auto"
          >
            {dict.common.buyNow}
          </Link>
        </div>
      )}
    </div>
  );
}
