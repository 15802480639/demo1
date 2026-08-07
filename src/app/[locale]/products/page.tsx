import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProducts, countProducts, type ProductFilter } from '@/lib/services/product-service';
import type { Gender } from '@/lib/types';
import { ProductListing } from '@/components/product/product-listing';
import { siteConfig } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  return {
    title: dict.nav.shop,
    description: dict.home.seoBody,
    alternates: { canonical: `/${loc}/products` },
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
  const sort = (['priceAsc', 'priceDesc', 'new'].includes(sp.sort ?? '')
    ? sp.sort
    : 'new') as 'new' | 'priceAsc' | 'priceDesc';
  const page = Math.max(1, Number(sp.page) || 1);

  const filter: ProductFilter = { gender, category, sale, isNew, sort };
  const [list, total] = await Promise.all([
    getProducts({ ...filter, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    countProducts(filter),
  ]);

  const title =
    gender === 'women'
      ? dict.nav.women
      : gender === 'men'
        ? dict.nav.men
        : sale
          ? dict.nav.sale
          : dict.nav.shop;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl sm:text-6xl text-ink mb-2">{title}</h1>
      <div className="luxe-rule mb-8" />
      <ProductListing
        products={list}
        total={total}
        page={page}
        sort={sort}
        locale={loc}
        dict={dict}
        baseQuery={buildBaseQuery({ gender, category, sale, isNew })}
      />
    </div>
  );
}

function buildBaseQuery(f: {
  gender?: Gender;
  category?: string;
  sale: boolean;
  isNew: boolean;
}): string {
  const q = new URLSearchParams();
  if (f.gender) q.set('gender', f.gender);
  if (f.category) q.set('cat', f.category);
  if (f.sale) q.set('sale', '1');
  if (f.isNew) q.set('new', '1');
  const s = q.toString();
  return s ? `?${s}` : '';
}

