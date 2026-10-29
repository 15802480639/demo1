import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProductBySlug, getProducts } from '@/lib/services/product-service';
import { formatPrice, productName } from '@/lib/format';
import { siteConfig } from '@/lib/site';
import { buildMetadata, faqJsonLd, breadcrumbJsonLd, clampDesc, productJsonLd } from '@/lib/seo';
import { getFaqs, buildAnswerBlock } from '@/lib/geo';
import { urlProduct } from '@/lib/urls';
import { getKakaoUrl } from '@/lib/kakao';
import { JsonLd } from '@/components/seo/json-ld';
import { ProductCard } from '@/components/product/product-card';
import { AddToCart } from '@/components/product/add-to-cart';
import { WishlistButton } from '@/components/product/wishlist-button';
import { AskAboutProduct } from '@/components/product/ask-about-product';
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
  const dict = getDictionary(loc);
  const product = await getProductBySlug(slug);
  if (!product) return { title: dict.common.notFound, robots: { index: false, follow: false } };

  // 标题强制品牌共现：AI 靠「品牌 + 产品词」共现判断实体关系
  const dispName = productName(product, loc);
  const title = `${dispName} ${siteConfig.name} ${product.category ?? dict.product.categoryFallback}`.trim();
  // 描述以「答案块」开头 —— 记忆库 §3.1：AI 抽取实体时正文首句决定品牌与产品的关联强度
  const answer = buildAnswerBlock({
    productName: dispName,
    category: product.category,
    price: product.price,
    currency: siteConfig.currency,
  });
  const desc = clampDesc(answer, product.description ?? '');

  return buildMetadata({
    locale: loc,
    title,
    description: desc,
    path: `/products/${slug}`,
    image: product.images[0],
  });
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
  const dispName = productName(product, loc);

  const related = (
    await getProducts({ gender: product.gender, take: 8 })
  ).filter((p) => p.slug !== product.slug).slice(0, 4);

  // 该商品的专属 FAQ；无则取全站通用，保证 FAQPage schema 永不为空
  const faqs = await getFaqs(loc, { scope: 'product', target: slug });
  const globalFaqs = faqs.length > 0 ? faqs : await getFaqs(loc, { scope: 'global', limit: 4 });
  const faqData = faqJsonLd(globalFaqs);

  const crumbs = breadcrumbJsonLd([
    { name: dict.nav.home, url: `${siteConfig.url}/${loc}` },
    { name: dict.nav.shop, url: `${siteConfig.url}/${loc}/products` },
    {
      name: dispName,
      url: `${siteConfig.url}/${loc}/products/${slug}`,
    },
  ]);

  /**
   * 🔴 记忆库 §8 遗留项：产品页一直缺 AggregateRating / Review。
   * rating / reviewCount 字段本来就在库里，schema 完全没用 → AI 判定「零社会证明」不采信。
   * 注意：无真实评价时**绝不输出** aggregateRating —— 宁可缺字段不可伪造评分。
   */
  const avg =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) /
        product.reviews.length
      : 0;

  const productLd = productJsonLd({
    name: dispName,
    description: (loc === 'zh' ? product.descriptionZh || product.description : product.description) ?? undefined,
    image: product.images,
    price: product.price,
    currency: siteConfig.currency,
    sku: product.brandCode ?? undefined,
    url: urlProduct(slug, loc),
    brand: product.brand,
    rating: avg,
    reviewCount: product.reviews.length,
    reviews: product.reviews.slice(0, 5).map((r) => ({
      author: r.author,
      rating: r.rating,
      text: r.content ?? r.title ?? '',
      date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : undefined,
    })),
  });

  // 可见答案块：首段就告诉 AI 「这是什么品牌 + 什么品类 + 什么场景 + 什么卖点」
  const answerBlock = buildAnswerBlock({
    productName: dispName,
    category: product.category,
    price: product.price,
    currency: siteConfig.currency,
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-10">
      <JsonLd data={productLd} />
      <JsonLd data={crumbs} />
      {faqData ? <JsonLd data={faqData} /> : null}

      {/* 答案块：AI 与访客共用的第一句话 */}
      <div className="border-l-2 border-accent bg-surface px-5 py-4 mb-8 max-w-4xl">
        <p className="text-sm text-ink-soft leading-relaxed">{answerBlock}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* image */}
        <ProductGallery images={product.images} name={dispName} />

        {/* info */}
        <div className="py-2">
          <p className="text-xs tracking-widest text-accent mb-3">
            {product.brandCode} · {product.brand}
          </p>
          {/* H1 必须含品牌：记忆库 §3.1 最高优先级，AI 抽取实体时产品与品牌不能是两张皮 */}
          <h1 className="font-display text-3xl sm:text-5xl text-ink leading-tight">
            {dispName}
            <span className="block text-base font-sans tracking-widest text-accent mt-2">
              {siteConfig.name}
              {product.brand ? ` · ${product.brand}` : ''}
            </span>
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

          <AddToCart product={product} kakaoUrl={await getKakaoUrl()} />

          <div className="mt-4 flex items-center gap-5">
            <WishlistButton slug={product.slug} className="inline-flex items-center gap-2 text-sm" />
            <AskAboutProduct
              slug={product.slug}
              name={dispName}
              className="inline-flex items-center gap-2 text-sm"
            />
          </div>

          <div className="mt-8">
            <h2 className="text-sm tracking-widest text-muted mb-2">
              {dict.product.description}
            </h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              {(loc === 'zh' ? product.descriptionZh || product.description : product.description) ||
                dict.home.seoBody}
            </p>
          </div>

          {/* 商品规格参数表 —— 后台配置的多规格，既给访客看也给 AI 抽取 */}
          {product.specs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm tracking-widest text-muted mb-3">
                {dict.product.specs}
              </h2>
              <dl className="border-t border-line">
                {product.specs.map((sp) => (
                  <div
                    key={sp.name}
                    className="flex gap-4 py-2.5 border-b border-line text-sm"
                  >
                    <dt className="w-24 shrink-0 text-muted">
                      {loc === 'zh' ? sp.nameZh || sp.name : sp.name}
                    </dt>
                    <dd className="text-ink-soft flex flex-wrap gap-1.5">
                      {sp.values.map((v, i) => (
                        <span key={i}>
                          {loc === 'zh' ? v.zh || v.ko : v.ko}
                          {i < sp.values.length - 1 ? '、' : ''}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
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
            {dict.product.writeReview}
          </p>
          <div className="flex justify-center">
            <ReviewForm slug={slug} />
          </div>
        </div>
      </section>

      {/* FAQ —— 既是给访客看的答案块，也是 AI 直接引用的内容源 */}
      {globalFaqs.length > 0 && (
        <section className="mt-20 border-t border-line pt-12">
          <SectionHeading title={dict.faq.heading} />
          <div className="max-w-3xl space-y-6">
            {globalFaqs.map((f, i) => (
              <details
                key={i}
                open={i === 0}
                className="group border-b border-line pb-4 last:border-0"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-ink font-medium hover:text-accent transition-colors">
                  {f.question}
                  <span className="text-accent text-lg leading-none shrink-0 ml-4 group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="text-sm text-muted leading-relaxed mt-3 whitespace-pre-wrap">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

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
