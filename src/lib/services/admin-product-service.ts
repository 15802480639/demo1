import { prisma } from '@/lib/prisma';

export type AdminSkuInput = {
  id?: string;
  size?: string;
  color?: string;
  stock: number;
  price?: number;
};

export type ProductInput = {
  name: string;
  code?: string;
  description?: string;
  gender?: string;
  brandId?: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number;
  tags?: string[];
  status?: string;
  images?: string[];
  skus?: AdminSkuInput[];
};

function slugBase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || 'product';
  for (let i = 0; i < 8; i++) {
    const slug = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 7)}`;
    const ex = await prisma.product.findUnique({ where: { slug } });
    if (!ex) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function skuCodeFor(code: string | undefined, s: AdminSkuInput): string {
  const base = (code || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const variant = (s.size || s.color || Math.random().toString(36).slice(2, 5)).toUpperCase();
  return `${base}-${variant}`;
}

function optionsFor(s: AdminSkuInput) {
  const o: Record<string, string> = {};
  if (s.color) o.Color = s.color;
  if (s.size) o.Size = s.size;
  if (!s.color && !s.size) o.Option = 'Default';
  return o;
}

export async function getAdminProducts() {
  return prisma.product.findMany({
    include: { brand: true, category: true, skus: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { brand: true, category: true, skus: true },
  });
}

export async function getBrands() {
  return prisma.brand.findMany({ orderBy: { name: 'asc' } });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function createProduct(data: ProductInput) {
  const slug = await uniqueSlug(slugBase(data.code || data.name));
  const skus = (data.skus ?? []).map((s) => ({
    skuCode: skuCodeFor(data.code, s),
    options: JSON.stringify(optionsFor(s)),
    stock: s.stock ?? 0,
    price: s.price ?? null,
  }));
  return prisma.product.create({
    data: {
      slug,
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      gender: data.gender || null,
      brandId: data.brandId || null,
      categoryId: data.categoryId,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      tags: JSON.stringify(data.tags ?? []),
      status: data.status || 'draft',
      images: JSON.stringify(data.images ?? []),
      skus: { create: skus },
    },
    include: { skus: true },
  });
}

export async function updateProduct(id: string, data: ProductInput) {
  // 现有 SKU 路由
  const existing = await prisma.sku.findMany({ where: { productId: id } });
  const incoming = data.skus ?? [];
  const incomingIds = new Set(incoming.filter((s) => s.id).map((s) => s.id!));

  for (const s of incoming) {
    const payload = {
      skuCode: skuCodeFor(data.code, s),
      options: JSON.stringify(optionsFor(s)),
      stock: s.stock ?? 0,
      price: s.price ?? null,
    };
    if (s.id) {
      await prisma.sku.update({ where: { id: s.id }, data: payload });
    } else {
      await prisma.sku.create({ data: { ...payload, productId: id } });
    }
  }
  // 删除被移除的 SKU
  for (const e of existing) {
    if (!incomingIds.has(e.id)) {
      await prisma.sku.delete({ where: { id: e.id } });
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      gender: data.gender || null,
      brandId: data.brandId || null,
      categoryId: data.categoryId,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      tags: JSON.stringify(data.tags ?? []),
      status: data.status || 'draft',
      images: JSON.stringify(data.images ?? []),
    },
    include: { skus: true },
  });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}
