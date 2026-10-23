import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * 后台给客户发券。
 * POST /api/admin/customers/[id]/coupons
 * body: { couponId: string, expiresAt?: string }
 */
export async function POST(
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
    const couponId = String(body.couponId ?? '').trim();
    if (!couponId) {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) return NextResponse.json({ error: 'coupon_not_found' }, { status: 404 });

    const uc = await prisma.userCoupon.create({
      data: {
        userId: id,
        couponId,
        source: 'admin',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : coupon.expiresAt,
      },
    });

    return NextResponse.json({ ok: true, id: uc.id });
  } catch (e) {
    console.error('grant coupon error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
