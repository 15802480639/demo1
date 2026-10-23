import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProducts, countProducts } from '@/lib/services/product-service';
import { prisma } from '@/lib/prisma';
import { ProductListing } from '@/components/product/product-listing';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { siteConfig } from '@/lib/site';
import { clampDesc, itemListJsonLd, collectionPageJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import {
  baseUrl,
  urlHome,
  urlCategoryPath,
  urlProduct,
  urlBrands,
} from '@/lib/urls';
import {
  getCategoryTree,
  resolveCategoryPath,
  categoryLabel,
  type CategoryNode,
} from '@/lib/category-tree';

const PER_PAGE = 12;

/** 路径段 → 分类节点链 */
async function resolvePath(
  path: string[],
): Promise<{ chain: CategoryNode[]; tree: CategoryNode[] } | null> {
  const tree = await getCategoryTree();
  const chain = resolveCategoryPath(tree, path);
  if (!chain || !chain.length) return null;
  return { chain, tree };
}

/** 分类页标题：末级分类名 */
function titleOf(chain: CategoryNode[], locale: Locale): string {
  return categoryLabel(chain[chain.length - 1], locale);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; path: string[] }>;
}): Promise<Metadata> {
  const { locale, path } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  const resolved = await resolvePath(path);
  if (!resolved) {
    return { title: dict.nav.shop, robots: { index: false, follow: true } };
  }

  const { chain } = resolved;
  const title = titleOf(chain, loc);
  const canonical = urlCategoryPath(chain.map((c) => c.slug), loc);
  const description = clampDesc(
    `${siteConfig.name} ${title} — ${dict.home.seoBody}`.slice(0, 300),
  );

  const languages: Record<string, string> = {};
  for (const l of ['ko', 'zh', 'en'] as Locale[]) {
    languages[l] = urlCategoryPath(chain.map((c) => c.slug), l);
  }
  languages['x-default'] = urlCategoryPath(chain.map((c) => c.slug), 'ko');

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    keywords: [title, siteConfig.name, 'golfwear', '골프웨어', '高尔夫服饰'],
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      url: canonical,
      locale: loc,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, path } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const sp = await searchParams;

  const resolved = await resolvePath(path);
  if (!resolved) notFound();
  const { chain, tree } = resolved;

  const leaf = chain[chain.length - 1];
  const title = titleOf(chain, loc);

  const sort = (['priceAsc', 'priceDesc', 'new'].includes(sp.sort ?? '')
    ? sp.sort
    : 'new') as 'new' | 'priceAsc' | 'priceDesc';
  const page = Math.max(1, Number(sp.page) || 1);

  const [list, total, allBrands] = await Promise.all([
    getProducts({ category: leaf.slug, sort, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    countProducts({ category: leaf.slug }),
    prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  // 结构化数据：CollectionPage + BreadcrumbList + ItemList
  const canonical = urlCategoryPath(chain.map((c) => c.slug), loc);
  const crumbItems = [
    { name: dict.nav.home, url: urlHome(loc) },
    ...chain.map((c, i) => ({
      name: categoryLabel(c, loc),
      url: urlCategoryPath(chain.slice(0, i + 1).map((x) => x.slug), loc),
    })),
  ];
  const listLd = itemListJsonLd(
    list.map((p) => ({
      name: p.name,
      url: urlProduct(p.slug, loc),
      image: p.image,
    })),
    `${siteConfig.name} — ${title}`,
  );
  const pageLd = collectionPageJsonLd({
    name: `${siteConfig.name} — ${title}`,
    description: dict.home.seoBody,
    url: canonical,
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
      <JsonLd data={pageLd} />
      <JsonLd data={breadcrumbJsonLd(crumbItems)} />
      <JsonLd data={listLd} />

      <Breadcrumbs
        items={crumbItems.map((c) => ({ name: c.name, href: c.url }))}
        className="mb-4"
      />

      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-2">{title}</h1>
      <p className="text-sm text-muted mb-2">
        {dict.common.itemCount.replace('{n}', String(total))}
      </p>
      <div className="luxe-rule mb-8" />

      {/* 子分类下钻：当前分类下还有子分类时展示入口 */}
      {leaf.children.length > 0 && (
        <div className="mb-10">
          <p className="text-xs tracking-widest text-muted mb-3">分类</p>
          <div className="flex flex-wrap gap-2">
            {leaf.children.map((child) => (
              <a
                key={child.id}
                href={urlCategoryPath([...chain.map((c) => c.slug), child.slug], loc)}
                className="text-sm px-4 py-2 border border-line text-ink hover:border-accent hover:text-accent transition-colors"
              >
                {categoryLabel(child, loc)}
              </a>
            ))}
          </div>
        </div>
      )}

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
        brand=""
        baseQuery=""
      />
    </div>
  );
}
