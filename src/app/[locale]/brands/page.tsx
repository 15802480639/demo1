import type { Metadata } from 'next';
import Link from 'next/link';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { prisma } from '@/lib/prisma';
import { SectionHeading } from '@/components/home/section-heading';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  return { title: getDictionary(loc).nav.brands, alternates: { canonical: `/${loc}/brands` } };
}

export default async function BrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
      <SectionHeading title={dict.nav.brands} center />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-line border border-line">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/${loc}/products?brand=${b.slug}`}
            className="bg-surface flex flex-col items-center justify-center h-28 font-display text-2xl text-ink-soft hover:text-accent hover:bg-surface-2 transition-colors"
          >
            <span>{b.name}</span>
            <span className="text-[11px] tracking-widest text-muted mt-1">
              {b._count.products}
            </span>
          </Link>
        ))}
        {brands.length === 0 && (
          <p className="col-span-full p-6 text-sm text-muted">No brands yet.</p>
        )}
      </div>
    </div>
  );
}
