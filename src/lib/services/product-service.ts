import { prisma } from '@/lib/prisma';
import { getCategoryScopeSlugs } from '@/lib/category-tree';
import type { Badge, Gender, Product, ProductDetail } from '@/lib/types';

export interface ProductFilter {
  gender?: Gender;
  category?: string; // 分类 slug
  sale?: boolean;
  isNew?: boolean;
  brand?: string; // 品牌 slug 或名称
  featured?: boolean;
  q?: string; // 关键词（名称/货号包含）
  sort?: 'new' | 'priceAsc' | 'priceDesc';
  take?: number;
  skip?: number;
}

type ProductRow = {
  slug: string;
  name: string;
  nameZh?: string | null;
  code: string | null;
  price: number; // SQLite Int -> number
  compareAtPrice: number | null;
  tags: string; // JSON 字符串
  gender: string | null;
  images: string; // JSON 字符串
  brand: { name: string } | null;
  category: { slug: string } | null;
};

function parseArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseObj(s: string | null | undefined): Record<string, string> | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? (v as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function toView(p: ProductRow): Product {
  const images = parseArray(p.images);
  const tags = parseArray(p.tags) as Badge[];
  return {
    slug: p.slug,
    name: p.name,
    nameZh: p.nameZh ?? undefined,
    brandCode: p.code ?? p.brand?.name ?? '',
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? undefined,
    badges: tags,
    gender: (p.gender ?? undefined) as Gender | undefined,
    category: p.category?.slug ?? undefined,
    image: images[0],
  };
}

async function buildWhere(f: ProductFilter): Promise<Record<string, unknown>> {
  const where: Record<string, unknown> = { status: 'active' };
  if (f.gender) where.gender = f.gender;
  if (f.category) {
    // 3 级分类：传入一级分类时，要同时包含其下所有子分类的商品。
    // 例：点「女装」应能同时看到「女装 → 上衣 → 棉质T恤」下的商品。
    const slugs = await getCategoryScopeSlugs(f.category);
    if (slugs && slugs.length) {
      where.category = { slug: { in: slugs } };
    } else {
      // 分类不存在 → 返回空结果，而不是退化成「不限分类」把全部商品都列出来
      where.category = { slug: '__no_such_category__' };
    }
  }
  if (f.sale) where.compareAtPrice = { not: null };
  if (f.brand) where.brand = { slug: f.brand };
  if (f.featured) where.featured = true;
  if (f.q) {
    const q = f.q;
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
      { brand: { name: { contains: q } } },
    ];
  }
  return where;
}

export async function getProducts(f: ProductFilter = {}): Promise<Product[]> {
  const where = await buildWhere(f);
  let rows = await prisma.product.findMany({
    where,
    include: { brand: true, category: true },
    orderBy:
      f.sort === 'priceAsc'
        ? { price: 'asc' }
        : f.sort === 'priceDesc'
          ? { price: 'desc' }
          : { createdAt: 'desc' },
    take: f.take,
    skip: f.skip,
  });
  if (f.isNew) {
    rows = rows.filter((r) =>
      parseArray((r as unknown as ProductRow).tags).includes('new'),
    );
  }
  return (rows as unknown as ProductRow[]).map(toView);
}

export async function countProducts(f: ProductFilter = {}): Promise<number> {
  const where = await buildWhere(f);
  let rows = await prisma.product.findMany({ where, select: { tags: true } });
  if (f.isNew) {
    rows = rows.filter((r) =>
      parseArray((r as unknown as { tags: string }).tags).includes('new'),
    );
  }
  return rows.length;
}

export async function getStockMap(slugs: string[]): Promise<Record<string, number>> {
  if (!slugs.length) return {};
  const products = await prisma.product.findMany({
    where: { slug: { in: [...new Set(slugs)] } },
    include: { skus: true },
  });
  const map: Record<string, number> = {};
  for (const p of products) {
    map[p.slug] = (p.skus as unknown as { stock?: number }[]).reduce(
      (s, sk) => s + (sk.stock ?? 0),
      0,
    );
  }
  return map;
}

function parseSpecValues(v: string | null): { ko: string; zh?: string }[] {
  try {
    const arr = JSON.parse(v ?? '[]');
    if (!Array.isArray(arr)) return [];
    return arr.map((x: unknown) =>
      typeof x === 'string' ? { ko: x } : (x as { ko: string; zh?: string }),
    );
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      skus: true,
      specs: { orderBy: { order: 'asc' } },
      reviews: { include: { user: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!p) return null;

  const base = toView(p as unknown as ProductRow);
  return {
    ...base,
    description: p.description ?? '',
    descriptionZh: (p as unknown as { descriptionZh?: string | null }).descriptionZh ?? undefined,
    brand: p.brand?.name ?? '',
    images: parseArray(p.images),
    skus: p.skus.map((s) => ({
      id: s.id,
      skuCode: s.skuCode,
      options: parseObj(s.options),
      price: s.price == null ? undefined : s.price,
      stock: s.stock,
    })),
    specs: (p.specs ?? []).map((sp) => ({
      name: sp.name,
      nameZh: sp.nameZh ?? undefined,
      values: parseSpecValues(sp.values),
    })),
    reviews: p.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      author: r.user?.name ?? 'Anonymous',
      createdAt: r.createdAt,
    })),
  };
}

export async function getFeatured(n = 8): Promise<Product[]> {
  return getProducts({ featured: true, take: n });
}

export async function getNewArrivals(n = 8): Promise<Product[]> {
  return getProducts({ isNew: true, take: n });
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'active' },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getBrands() {
  return prisma.brand.findMany({
    orderBy: { name: 'asc' },
    select: { slug: true, name: true },
  });
}
