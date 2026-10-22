import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dict } from '@/i18n/dictionaries';
import { formatPrice, productName } from '@/lib/format';
import type { Product } from '@/lib/types';
import { WishlistButton } from './wishlist-button';

function badgeStyle(badge: string, dict: Dict) {
  if (badge === 'new')
    return { label: dict.common.new, cls: 'bg-forest text-white' };
  if (badge === 'sale')
    return { label: dict.common.sale, cls: 'bg-accent text-white' };
  return { label: dict.common.overseasShipping, cls: 'bg-ink text-accent-pale' };
}

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dict;
}) {
  const href = `/${locale}/products/${product.slug}`;
  const discounted =
    typeof product.compareAtPrice === 'number' &&
    product.compareAtPrice > product.price;
  const offPercent = discounted
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  return (
    <Link href={href} className="group block">
      <div className="card-lift relative bg-surface-2 rounded-card overflow-hidden ring-1 ring-line/60 group-hover:ring-accent/40 transition-all">
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-surface to-surface-2 flex items-center justify-center">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={productName(product, locale)}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <span className="font-display text-5xl text-line select-none">
              {product.brandCode.slice(0, 2)}
            </span>
          )}

          {/* 悬停时自下而上的查看详情条 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            <div className="bg-ink/90 backdrop-blur-sm text-white text-center text-[11px] tracking-luxe py-3">
              {dict.common.viewDetail}
            </div>
          </div>

          <div className="absolute top-3 right-3">
            <WishlistButton slug={product.slug} />
          </div>
          {product.badges && product.badges.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {product.badges.map((b) => {
                const s = badgeStyle(b, dict);
                return (
                  <span
                    key={b}
                    className={`text-[10px] tracking-widest px-2.5 py-1 rounded-sm shadow-sm ${s.cls}`}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
          )}
          {discounted && (
            <div className="absolute bottom-3 left-3">
              <span className="text-[11px] font-semibold tracking-wider px-2 py-1 rounded-sm bg-accent text-white">
                -{offPercent}%
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="pt-4 pb-1">
        <p className="text-[11px] tracking-wider text-muted mb-1.5">
          {product.brandCode}
        </p>
        <h3 className="text-sm text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {productName(product, locale)}
        </h3>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold ${discounted ? 'text-accent-strong' : 'text-ink'}`}
          >
            {formatPrice(product.price, locale)}
          </span>
          {discounted && (
            <span className="text-xs text-muted line-through">
              {formatPrice(product.compareAtPrice!, locale)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
