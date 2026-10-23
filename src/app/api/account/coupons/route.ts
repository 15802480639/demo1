import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * 我的优惠券。
 * GET /api/account/coupons — 列出当前用户持有的券
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const rows = await prisma.userCoupon.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      include: { coupon: true },
    });

    // 过期券自动置为 expired（写库，保证下次进来状态一致）
    const expiredIds = rows
      .filter(
        (r) =>
          r.status === 'available' &&
          ((r.expiresAt && r.expiresAt < now) ||
            (r.coupon.expiresAt && r.coupon.expiresAt < now)),
      )
      .map((r) => r.id);
    if (expiredIds.length) {
      await prisma.userCoupon.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'expired' },
      });
    }

    const coupons = rows.map((r) => {
      const c = r.coupon;
      const couponExpired =
        (r.expiresAt && r.expiresAt < now) || (c.expiresAt && c.expiresAt < now);
      const notStarted = c.startsAt && c.startsAt > now;
      const status =
        r.status === 'used'
          ? 'used'
          : couponExpired
            ? 'expired'
            : notStarted
              ? 'pending'
              : 'available';
      return {
        id: r.id,
        code: c.code,
        type: c.type,
        value: c.value,
        minSpend: c.minSpend,
        productIds: c.productIds,
        status,
        expiresAt: r.expiresAt ?? c.expiresAt,
        usedOrderNo: r.usedOrderNo,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ coupons });
  } catch (e) {
    console.error('my coupons error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
