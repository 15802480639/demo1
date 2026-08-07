import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAdminProducts,
  getBrands,
  getCategories,
  createProduct,
} from '@/lib/services/admin-product-service';

export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const [products, brands, categories] = await Promise.all([
    getAdminProducts(),
    getBrands(),
    getCategories(),
  ]);
  return NextResponse.json({ products, brands, categories });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (!body.name || !body.categoryId || !(Number(body.price) > 0)) {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }
    const product = await createProduct({
      ...body,
      price: Number(body.price),
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
    });
    return NextResponse.json({ ok: true, product });
  } catch (e) {
    console.error('create product error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
