import { prisma } from '@/lib/prisma';

export interface CategoryView {
  slug: string;
  name: string;
  nameZh: string | null;
  imageUrl: string | null;
}

export async function getCategories(): Promise<CategoryView[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameZh: c.nameZh,
    imageUrl: c.imageUrl,
  }));
}
