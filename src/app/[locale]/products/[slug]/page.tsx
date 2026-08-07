import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProductBySlug, getProducts } from '@/lib/services/product-service';
import { formatPrice } from '@/lib/format';
import { siteConfig } from '@/lib/site';
import { JsonLd } from '@/components/seo/json-ld';
import { ProductCard } from '@/components/product/product-card';
import { AddToCart } from '@/components/product/add-to-cart';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ReviewForm } from '@/components/product/review-form';
import { ProductGallery } from '@/components/product/product-gallery';
import { SectionHeading } from '@/components/home/section-heading';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found' };
  return {
    title: product.name,
    description: `${product.name} — ${formatPrice(product.price, loc)}`,
    alternates: { canonical: `/${loc}/products/${slug}` },
    openGraph: {
      title: product.name,
      description: product.name,
      images: product.images.length ? product.images : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (
    await getProducts({ gender: product.gender, take: 8 })
  ).filter((p) => p.slug !== product.slug).slice(0, 4);

  const avg =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) /
        product.reviews.length
      : 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-10">
      <JsonLd
        data={{
          '@type': 'Product',
          name: product.name,
          brand: { '@type': 'Brand', name: product.brand },
          sku: product.brandCode,
          image: product.images,
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'KRW',
            availability: 'https://schema.org/InStock',
            url: `${siteConfig.url}/${loc}/products/${slug}`,
          },
        }}
      />

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* image */}
        <ProductGallery images={product.images} name={product.name} />

        {/* info */}
        <div className="py-2">
          <p className="text-xs tracking-widest text-accent mb-3">
            {product.brandCode} · {product.brand}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-ink leading-tight">
            {product.name}
          </h1>

          {/* rating */}
          {avg > 0 && (
            <p className="mt-3 text-sm text-muted">
              ★ {avg.toFixed(1)} ({product.reviews.length})
            </p>
          )}

          <p className="mt-5 text-2xl text-ink font-medium">
            {formatPrice(product.price, loc)}
            {product.compareAtPrice && (
              <span className="ml-3 text-base text-muted line-through">
                {formatPrice(product.compareAtPrice, loc)}
              </span>
            )}
          </p>

          <div className="luxe-rule my-8" />

          <AddToCart product={product} />

          <div className="mt-4">
            <WishlistButton slug={product.slug} className="inline-flex items-center gap-2 text-sm" />
          </div>

          <div className="mt-8">
            <h2 className="text-sm tracking-widest text-muted mb-2">
              {dict.product.description}
            </h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              {product.description || dict.home.seoBody}
            </p>
          </div>
        </div>
      </div>

      {/* reviews */}
      <section className="mt-20">
        <SectionHeading
          title={dict.product.reviews}
          subtitle={product.reviews.length > 0 ? `★ ${avg.toFixed(1)} · ${product.reviews.length}` : undefined}
          center
        />
        {product.reviews.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
            {product.reviews.map((r) => (
              <div key={r.id} className="border border-line p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ink">
                    {r.author}
                  </span>
                  <span className="text-accent text-sm">★ {r.rating}</span>
                </div>
                {r.title && <p className="text-sm font-medium text-ink">{r.title}</p>}
                <p className="text-ink-soft text-sm">{r.content}</p>
              </div>
            ))}
          </div>
        )}
        <div className="text-center">
          <p className="text-xs tracking-widest text-muted mb-3">
            {locale === 'ko' ? '구매 후기 작성' : 'WRITE A REVIEW'}
          </p>
          <div className="flex justify-center">
            <ReviewForm slug={slug} />
          </div>
        </div>
      </section>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeading title={dict.product.related} center />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} locale={loc} dict={dict} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
