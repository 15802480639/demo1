import type { Locale } from '@/i18n/config';
import type { Dict } from '@/i18n/dictionaries';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/product-card';

export function ProductSlider({
  products,
  locale,
  dict,
}: {
  products: Product[];
  locale: Locale;
  dict: Dict;
}) {
  return (
    <div className="no-scrollbar flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {products.map((p) => (
        <div key={p.slug} className="min-w-[230px] sm:min-w-[260px] flex-1">
          <ProductCard product={p} locale={locale} dict={dict} />
        </div>
      ))}
    </div>
  );
}
