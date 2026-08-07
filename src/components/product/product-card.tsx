import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dict } from '@/i18n/dictionaries';
import { formatPrice } from '@/lib/format';
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
  return (
    <Link href={href} className="group block">
      <div className="card-lift bg-surface-2 rounded-card overflow-hidden">
        <div className="relative aspect-[3/4] bg-gradient-to-b from-surface to-surface-2 flex items-center justify-center">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-5xl text-line select-none">
              {product.brandCode.slice(0, 2)}
            </span>
          )}
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
                    className={`text-[10px] tracking-widest px-2 py-1 ${s.cls}`}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="pt-3 pb-1">
        <p className="text-[11px] tracking-wider text-muted mb-1">
          {product.brandCode}
        </p>
        <h3 className="text-sm text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>
        <p className="mt-2 text-sm font-medium text-ink">
          {formatPrice(product.price, locale)}
        </p>
      </div>
    </Link>
  );
}
