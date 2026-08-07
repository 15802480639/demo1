import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toView } from '@/lib/services/product-service';

// GET: 登录用户的收藏列表（含商品视图）
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] });
  const rows = await prisma.wishlist.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: { brand: true, category: true, skus: true } } },
  });
  const items = rows
    .filter((r) => r.product.status === 'active')
    .map((r) => toView(r.product as any));
  return NextResponse.json({ items });
}

// POST: 加入收藏 { slug }
export async function POST(req: NextRequest) {
  const session = await requireUser();
  const { slug } = await req.json();
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  await prisma.wishlist.upsert({
    where: { userId_productId: { userId: session.id, productId: product.id } },
    create: { userId: session.id, productId: product.id },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

// DELETE: 移出收藏 ?slug=
export async function DELETE(req: NextRequest) {
  const session = await requireUser();
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'MISSING' }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return NextResponse.json({ ok: true });
  await prisma.wishlist.deleteMany({
    where: { userId: session.id, productId: product.id },
  });
  return NextResponse.json({ ok: true });
}
