import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteConfig } from '@/lib/site';
import { JsonLd } from '@/components/seo/json-ld';
import { HeroCarousel, type Banner } from '@/components/home/hero-carousel';
import { ValueProps } from '@/components/home/value-props';
import { CategorySplit } from '@/components/home/category-split';
import { BrandWall } from '@/components/home/brand-wall';
import { ProductSlider } from '@/components/home/product-slider';
import { ProductCard } from '@/components/product/product-card';
import { Subscribe } from '@/components/home/subscribe';
import { SeoBlock } from '@/components/home/seo-block';
import { SectionHeading } from '@/components/home/section-heading';
import { getFeatured, getNewArrivals } from '@/lib/services/product-service';
import { prisma } from '@/lib/prisma';

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

  // 首页中部介绍文案：后台可编辑（三语，留空回落词典默认）
  const seoRows: { key: string; value: string }[] = await prisma.siteSetting
    .findMany({
      where: {
        key: {
          in: [
            'home.seoHeading.ko',
            'home.seoHeading.zh',
            'home.seoHeading.en',
            'home.seoBody.ko',
            'home.seoBody.zh',
            'home.seoBody.en',
          ],
        },
      },
      select: { key: true, value: true },
    })
    .catch(() => []);
  const seoMap = new Map(seoRows.map((r) => [r.key, r.value]));
  const seoHeading = seoMap.get(`home.seoHeading.${loc}`) || dict.home.seoHeading;
  const seoBody = seoMap.get(`home.seoBody.${loc}`) || dict.home.seoBody;

  // 首页轮播：后台可编辑；数据库未配置 / 不可用时回退到字典文案 + 商品实拍图
  const rawBanners = await prisma.heroBanner
    .findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } })
    .catch(() => [] as never[]);
  const banners: Banner[] = rawBanners.map((b) => ({
    id: b.id,
    image: b.image,
    title: b.title,
    titleZh: b.titleZh,
    titleKo: b.titleKo,
    subtitle: b.subtitle,
    subtitleZh: b.subtitleZh,
    subtitleKo: b.subtitleKo,
    cta: b.cta,
    ctaZh: b.ctaZh,
    ctaKo: b.ctaKo,
    href: b.href,
  }));

  // 兜底大图：后台没配图时，用商品实拍图撑起全屏轮播
  const fallbackImages = [...featured, ...newArrivals]
    .map((p) => p.image)
    .filter((v): v is string => !!v)
    .slice(0, 4);

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

      <HeroCarousel banners={banners} fallbackImages={fallbackImages} />

      <ValueProps items={dict.home.valueProps} />

      <CategorySplit />

      {/* New arrivals */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-8 py-20 sm:py-24">
        <SectionHeading
          eyebrow={dict.home.newInEyebrow}
          title={dict.home.newArrivals}
          subtitle={dict.home.newArrivalsSub}
        />
        <ProductSlider products={newArrivals} locale={loc} dict={dict} />
      </section>

      {/* Brand wall */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <BrandWall title={dict.home.brandsTitle} />
      </section>

      {/* Featured grid */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-8 py-20 sm:py-24">
        <SectionHeading
          title={dict.home.featuredTitle}
          subtitle={dict.home.featuredSub}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
          {featured.map((p, i) => (
            <div
              key={p.slug}
              className="reveal"
              style={{ animationDelay: `${Math.min(i, 11) * 55}ms` }}
            >
              <ProductCard product={p} locale={loc} dict={dict} />
            </div>
          ))}
        </div>
      </section>

      <Subscribe />

      <SeoBlock heading={seoHeading} body={seoBody} />
    </>
  );
}
