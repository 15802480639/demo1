import { isLocale, type Locale } from '@/i18n/config';
import { prisma } from '@/lib/prisma';
import GeoKnowledgeBase from '@/components/admin/geo-knowledge-base';

export default async function AdminGeoRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;

  const [faqCount, productCount, categoryCount] = await Promise.all([
    prisma.faqItem.count({ where: { status: 'published' } }),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.category.count(),
  ]);

  return (
    <GeoKnowledgeBase loc={loc} stats={{ faqCount, productCount, categoryCount }} />
  );
}