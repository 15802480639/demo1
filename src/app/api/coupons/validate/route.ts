import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  const sub = Number(subtotal) || 0;
  if (!code) return NextResponse.json({ ok: false, error: 'NO_CODE' });

  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.active) {
    return NextResponse.json({ ok: false, error: 'INVALID' });
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return NextResponse.json({ ok: false, error: 'NOT_STARTED' });
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return NextResponse.json({ ok: false, error: 'EXPIRED' });
  }
  if (coupon.minSpend > sub) {
    return NextResponse.json({ ok: false, error: 'MIN_SPEND', minSpend: coupon.minSpend });
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return NextResponse.json({ ok: false, error: 'USED_UP' });
  }
  const discount =
    coupon.type === 'percent'
      ? Math.round((sub * coupon.value) / 100)
      : Math.min(coupon.value, sub);
  return NextResponse.json({
    ok: true,
    discount,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
  });
}
