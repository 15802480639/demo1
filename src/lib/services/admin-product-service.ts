import { prisma } from '@/lib/prisma';

export type AdminSkuInput = {
  id?: string;
  size?: string;
  color?: string;
  /** 动态规格组合：{ "색상": "레드", "사이즈": "M" } —— 多规格时用这个 */
  options?: Record<string, string>;
  stock: number;
  price?: number;
};

export type AdminSpecInput = {
  name: string; // 规格名（韩语/默认）
  nameZh?: string; // 规格名（中文）
  values: { ko: string; zh?: string }[];
};

export type ProductInput = {
  name: string;
  nameZh?: string;
  code?: string;
  description?: string;
  descriptionZh?: string;
  gender?: string;
  brandId?: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number;
  tags?: string[];
  status?: string;
  images?: string[];
  skus?: AdminSkuInput[];
  specs?: AdminSpecInput[];
  // ---- 积分配置 ----
  /** 是否参与消费返积分 */
  earnPoints?: boolean;
  /** 返积分方式：percent（按实付百分比）| fixed（按件固定返） */
  earnType?: string;
  /** percent 时是百分比整数（0 = 跟随全局）；fixed 时是每件返多少积分 */
  earnValue?: number;
  /** 是否允许用积分抵扣 */
  usePoints?: boolean;
  /** 该商品单笔最多可用积分数（0 = 不限） */
  maxPointUse?: number;
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

function skuCodeFor(code: string | undefined, s: AdminSkuInput, idx = 0): string {
  const base = (code || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const o = optionsFor(s);
  const variant =
    Object.values(o)
      .filter(Boolean)
      .join('-')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '') || `V${idx + 1}`;
  return `${base}-${variant || Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function optionsFor(s: AdminSkuInput): Record<string, string> {
  const o: Record<string, string> = {};
  // 多规格：直接透传后台传来的组合
  if (s.options && Object.keys(s.options).length > 0) {
    for (const [k, v] of Object.entries(s.options)) {
      if (k && v) o[k] = v;
    }
  }
  if (!o.Color && s.color) o.Color = s.color;
  if (!o.Size && s.size) o.Size = s.size;
  if (Object.keys(o).length === 0) o.Option = 'Default';
  return o;
}

export async function getAdminProducts() {
  return prisma.product.findMany({
    include: { brand: true, category: true, skus: true, specs: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { brand: true, category: true, skus: true, specs: { orderBy: { order: 'asc' } } },
  });
}

export async function getBrands() {
  return prisma.brand.findMany({ orderBy: { name: 'asc' } });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
}

/** 把积分配置规整成合法值 */
function pointConfigOf(data: ProductInput) {
  const earnType = data.earnType === 'fixed' ? 'fixed' : 'percent';
  const earnValue = Math.max(0, Math.floor(Number(data.earnValue) || 0));
  const maxPointUse = Math.max(0, Math.floor(Number(data.maxPointUse) || 0));
  return {
    earnPoints: data.earnPoints !== false,
    earnType,
    earnValue,
    usePoints: data.usePoints !== false,
    maxPointUse,
  };
}

export async function createProduct(data: ProductInput) {
  const slug = await uniqueSlug(slugBase(data.code || data.name));
  const skus = (data.skus ?? []).map((s, i) => ({
    skuCode: `${skuCodeFor(data.code, s, i)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    options: JSON.stringify(optionsFor(s)),
    stock: s.stock ?? 0,
    price: s.price ?? null,
  }));
  const specs = (data.specs ?? [])
    .filter((sp) => sp.name && sp.values?.length)
    .map((sp, i) => ({
      name: sp.name,
      nameZh: sp.nameZh || null,
      values: JSON.stringify(sp.values),
      order: i,
    }));
  return prisma.product.create({
    data: {
      slug,
      name: data.name,
      nameZh: data.nameZh || null,
      code: data.code || null,
      description: data.description || null,
      descriptionZh: data.descriptionZh || null,
      gender: data.gender || null,
      brandId: data.brandId || null,
      categoryId: data.categoryId,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      tags: JSON.stringify(data.tags ?? []),
      status: data.status || 'draft',
      images: JSON.stringify(data.images ?? []),
      ...pointConfigOf(data),
      skus: { create: skus },
      specs: { create: specs },
    },
    include: { skus: true, specs: { orderBy: { order: 'asc' } } },
  });
}

export async function updateProduct(id: string, data: ProductInput) {
  // 现有 SKU 路由
  const existing = await prisma.sku.findMany({ where: { productId: id } });
  const incoming = data.skus ?? [];
  const incomingIds = new Set(incoming.filter((s) => s.id).map((s) => s.id!));

  for (const [i, s] of incoming.entries()) {
    const payload = {
      skuCode: s.id ? skuCodeFor(data.code, s, i) : `${skuCodeFor(data.code, s, i)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
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

  // 规格组：整体重建（组的增删改排序变化都能覆盖）
  if (data.specs) {
    await prisma.productSpec.deleteMany({ where: { productId: id } });
    const specs = data.specs
      .filter((sp) => sp.name && sp.values?.length)
      .map((sp, i) => ({
        productId: id,
        name: sp.name,
        nameZh: sp.nameZh || null,
        values: JSON.stringify(sp.values),
        order: i,
      }));
    if (specs.length) await prisma.productSpec.createMany({ data: specs });
  }

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      nameZh: data.nameZh || null,
      code: data.code || null,
      description: data.description || null,
      descriptionZh: data.descriptionZh || null,
      gender: data.gender || null,
      brandId: data.brandId || null,
      categoryId: data.categoryId,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      tags: JSON.stringify(data.tags ?? []),
      status: data.status || 'draft',
      images: JSON.stringify(data.images ?? []),
      ...pointConfigOf(data),
    },
    include: { skus: true, specs: { orderBy: { order: 'asc' } } },
  });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}
