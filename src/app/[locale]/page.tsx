import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteConfig } from '@/lib/site';
import { JsonLd } from '@/components/seo/json-ld';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { CategorySplit } from '@/components/home/category-split';
import { BrandWall } from '@/components/home/brand-wall';
import { ProductSlider } from '@/components/home/product-slider';
import { ProductCard } from '@/components/product/product-card';
import { Subscribe } from '@/components/home/subscribe';
import { SeoBlock } from '@/components/home/seo-block';
import { SectionHeading } from '@/components/home/section-heading';
import { getFeatured, getNewArrivals } from '@/lib/services/product-service';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  const newArrivals = await getNewArrivals(12);
  const featured = await getFeatured(8);

  return (
    <>
      <JsonLd
        data={{
          '@type': 'ItemList',
          itemListElement: featured.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${siteConfig.url}/${loc}/products/${p.slug}`,
            name: p.name,
          })),
        }}
      />
      <HeroCarousel />

      <CategorySplit />

      {/* New arrivals */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-8 py-16">
        <SectionHeading
          eyebrow="NEW IN"
          title={dict.home.newArrivals}
          subtitle={dict.home.newArrivalsSub}
        />
        <ProductSlider products={newArrivals} locale={loc} dict={dict} />
      </section>

      <BrandWall title={dict.home.brandsTitle} />

      {/* Featured grid */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-8 py-16">
        <SectionHeading title={dict.home.featuredTitle} subtitle={dict.home.featuredSub} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} locale={loc} dict={dict} />
          ))}
        </div>
      </section>

      <Subscribe />

      <SeoBlock heading={dict.home.seoHeading} body={dict.home.seoBody} />
    </>
  );
}
