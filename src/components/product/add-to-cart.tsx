'use client';

import { useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { useCart } from '@/lib/cart-store';
import type { ProductDetail } from '@/lib/types';

export function AddToCart({ product }: { product: ProductDetail }) {
  const { dict, locale } = useLocale();
  const add = useCart((s) => s.add);
  const sizes = Array.from(
    new Set(product.skus.map((s) => s.options?.Size).filter(Boolean)),
  ) as string[];
  const [size, setSize] = useState(sizes[0] ?? '');
  const [added, setAdded] = useState(false);

  const stockFor = (sz: string) =>
    product.skus.find((s) => (s.options?.Size ?? '') === sz)?.stock ?? 0;
  const allSoldOut =
    product.skus.length > 0 && product.skus.every((s) => s.stock <= 0);
  const currentStock = size ? stockFor(size) : product.skus.length ? 0 : 999;
  const soldOut = allSoldOut || (size ? currentStock <= 0 : false);

  const handleAdd = () => {
    add({
      slug: product.slug,
      name: product.name,
      brandCode: product.brandCode,
      price: product.price,
      image: product.image,
      size: size || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-6">
      {sizes.length > 0 && (
        <div>
          <p className="text-xs tracking-widest text-muted mb-2">
            {dict.product.size}
          </p>
          <div className="flex gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`w-12 h-12 border text-sm transition-colors ${
                  size === s
                    ? 'border-ink bg-ink text-white'
                    : 'border-line hover:border-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleAdd} className="btn-gold flex-1" disabled={soldOut}>
          {soldOut
            ? locale === 'ko'
              ? '품절'
              : 'Sold out'
            : added
              ? '✓ ' + dict.common.addToCart
              : dict.common.addToCart}
        </button>
        <button onClick={handleAdd} className="btn-outline flex-1" disabled={soldOut}>
          {dict.common.buyNow}
        </button>
      </div>
      {soldOut && (
        <p className="text-xs text-red-600">
          {locale === 'ko' ? '품절된 상품입니다' : 'This item is sold out'}
        </p>
      )}
    </div>
  );
}
