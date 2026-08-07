import { NextRequest, NextResponse } from 'next/server';
import { getProducts, countProducts, getStockMap, type ProductFilter } from '@/lib/services/product-service';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // 批量库存查询（购物车页实时校验用）
  if (sp.get('slugs')) {
    const slugs = sp.get('slugs')!.split(',').filter(Boolean);
    const stock = await getStockMap(slugs);
    return NextResponse.json({ stock });
  }

  const f: ProductFilter = {};
  if (sp.get('q')) f.q = sp.get('q')!;
  if (sp.get('category')) f.category = sp.get('category')!;
  if (sp.get('gender')) f.gender = sp.get('gender') as ProductFilter['gender'];
  if (sp.get('brand')) f.brand = sp.get('brand')!;
  if (sp.get('sale') === '1') f.sale = true;
  if (sp.get('new') === '1') f.isNew = true;
  const sort = sp.get('sort');
  if (sort === 'priceAsc' || sort === 'priceDesc' || sort === 'new') f.sort = sort;
  const take = Number(sp.get('take'));
  if (take > 0) f.take = take;
  const page = Number(sp.get('page'));
  if (page > 1) f.skip = (page - 1) * (take > 0 ? take : 12);
  const skip = Number(sp.get('skip'));
  if (skip > 0) f.skip = skip;

  const [products, total] = await Promise.all([
    getProducts(f),
    countProducts(f),
  ]);
  return NextResponse.json({ products, total });
}
