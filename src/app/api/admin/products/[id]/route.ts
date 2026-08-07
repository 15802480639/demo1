import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateProduct, deleteProduct } from '@/lib/services/admin-product-service';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const product = await updateProduct(id, {
      ...body,
      price: Number(body.price),
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
    });
    return NextResponse.json({ ok: true, product });
  } catch (e) {
    console.error('update product error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
