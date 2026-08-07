import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const { productSlug, rating, title, content } = await req.json();
  const r = Number(rating);
  if (!productSlug || !(r >= 1 && r <= 5)) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const product = await prisma.product.findUnique({ where: { slug: productSlug } });
  if (!product) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const review = await prisma.review.create({
    data: {
      productId: product.id,
      userId: session.id,
      rating: r,
      title: title || null,
      content: content || null,
    },
  });

  // 重算商品平均评分与评价数
  const agg = await prisma.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: product.id },
    data: {
      rating: agg._avg.rating ?? 0,
      reviewCount: agg._count,
    },
  });

  return NextResponse.json({ ok: true, review });
}
