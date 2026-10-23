import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProducts, countProducts, type ProductFilter } from '@/lib/services/product-service';
import { prisma } from '@/lib/prisma';
import type { Gender } from '@/lib/types';
import { ProductListing } from '@/components/product/product-listing';
import { siteConfig } from '@/lib/site';
import { clampDesc, itemListJsonLd, collectionPageJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import { baseUrl, urlProducts, urlProduct, urlCategoryPath } from '@/lib/urls';
import { getCategoryTree, flattenTree } from '@/lib/category-tree';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const base = baseUrl();

  // 带筛选参数时 canonical 一律指回干净的 /products：
  // 参数 URL（?cat=&?sale=&page=）会重复消耗抓取预算，必须收敛到一个规范地址
  const hasFilter = Boolean(
    sp.cat || sp.gender || sp.sale === '1' || sp.new === '1' || sp.brand || sp.page
  );
  const canonical = urlProducts(loc);

  const languages: Record<string, string> = {
    ko: urlProducts('ko'),
    zh: urlProducts('zh'),
    en: urlProducts('en'),
  };
  languages['x-default'] = urlProducts('ko');

  // 只有无筛选参数的纯净列表页才允许索引
  const robots = hasFilter
    ? { index: false, follow: true }
    : { index: true, follow: true };

  return {
    title: dict.nav.shop,
    description: clampDesc(dict.home.seoBody),
    keywords: [
      'golfwear',
      'golf apparel',
      'golf jacket',
      'golf pants',
      'golf bag',
      'J&D',
      '제이앤디',
      '골프웨어',
      '高尔夫服饰',
    ],
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title: dict.nav.shop,
      description: clampDesc(dict.home.seoBody),
      url: canonical,
      locale: loc,
    },
    twitter: { card: 'summary_large_image' },
    robots,
    // 记忆库坑：canonical 被构建打回 localhost 会导致全站无法索引，故此处绝不用相对路径
  };
}

const PER_PAGE = 12;

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const sp = await searchParams;

  const gender = (sp.gender as Gender | undefined) ?? undefined;
  const category = sp.cat;
  const sale = sp.sale === '1';
  const isNew = sp.new === '1';
  const brandSlug = sp.brand || undefined;
  const sort = (['priceAsc', 'priceDesc', 'new'].includes(sp.sort ?? '')
    ? sp.sort
    : 'new') as 'new' | 'priceAsc' | 'priceDesc';
  const page = Math.max(1, Number(sp.page) || 1);

  // 3 级分类：老地址 /products?cat=xxx 301 到新路径 /c/xxx，
  // 让 SEO 权重集中到独立路径，老链接不失效（不 404）。
  if (category) {
    const tree = await getCategoryTree();
    // slug 可能来自 URL（已解码），做归一化匹配
    let decoded = category;
    try {
      decoded = decodeURIComponent(category);
    } catch {
      /* 保持原值 */
    }
    const flat = flattenTree(tree);
    const node =
      flat.find((n) => n.slug === category) ??
      flat.find((n) => n.slug === decoded);
    if (node) {
      // 若带其他筛选参数，保留在 query 里
      const rest = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) {
        if (k === 'cat' || !v) continue;
        rest.set(k, v);
      }
      const qs = rest.toString();
      redirect(`${urlCategoryPath([node.slug], loc)}${qs ? `?${qs}` : ''}`);
    }
  }

  const filter: ProductFilter = { gender, category, sale, isNew, brand: brandSlug, sort };
  const [list, total, allBrands] = await Promise.all([
    getProducts({ ...filter, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    countProducts(filter),
    prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ]);
  const activeBrand = brandSlug
    ? allBrands.find((b) => b.slug === brandSlug)
    : undefined;

  const title =
    activeBrand
      ? (activeBrand.nameZh || activeBrand.name)
      : gender === 'women'
        ? dict.nav.women
        : gender === 'men'
          ? dict.nav.men
          : sale
            ? dict.nav.sale
            : dict.nav.shop;

  //结构化数据：CollectionPage + BreadcrumbList + ItemList
  // ItemList 的每条 URL 用真实带 locale 的地址（之前死链的根源就是漏了 locale）
  const canonical = urlProducts(loc);
  const crumbs = breadcrumbJsonLd([
    { name: dict.nav.home, url: `${baseUrl()}/${loc}` },
    { name: title, url: canonical },
  ]);
  const listLd = itemListJsonLd(
    list.map((p) => ({
      name: p.name,
      url: urlProduct(p.slug, loc),
      image: p.image,
    })),
    `${siteConfig.name} — ${title}`
  );
  const pageLd = collectionPageJsonLd({
    name: `${siteConfig.name} — ${title}`,
    description: dict.home.seoBody,
    url: canonical,
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
      <JsonLd data={pageLd} />
      <JsonLd data={crumbs} />
      <JsonLd data={listLd} />

      {/* 可见面包屑：既给访客看，也给 AI 抓页面层级 */}
      <nav aria-label="breadcrumb" className="text-xs text-muted mb-4">
        <a href={`/${loc}`} className="hover:text-accent">
          {dict.nav.home}
        </a>
        <span className="mx-2">/</span>
        <span className="text-ink">{title}</span>
        {category && (
          <>
            <span className="mx-2">/</span>
            <span className="text-ink">{category}</span>
          </>
        )}
      </nav>

      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-2">{title}</h1>
      <div className="luxe-rule mb-8" />
      <ProductListing
        products={list}
        total={total}
        page={page}
        sort={sort}
        locale={loc}
        dict={dict}
        brands={allBrands.map((b) => ({
          slug: b.slug,
          name: b.name,
          nameZh: b.nameZh,
          count: b._count.products,
        }))}
        brand={brandSlug ?? ''}
        baseQuery={buildBaseQuery({ gender, category, sale, isNew, brand: brandSlug })}
      />
    </div>
  );
}

function buildBaseQuery(f: {
  gender?: Gender;
  category?: string;
  sale: boolean;
  isNew: boolean;
  brand?: string;
}): string {
  const q = new URLSearchParams();
  if (f.gender) q.set('gender', f.gender);
  if (f.category) q.set('cat', f.category);
  if (f.sale) q.set('sale', '1');
  if (f.isNew) q.set('new', '1');
  if (f.brand) q.set('brand', f.brand);
  const s = q.toString();
  return s ? `?${s}` : '';
}