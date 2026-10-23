import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getPointRule,
  calcRedeemQuote,
  pointsToDiscount,
} from '@/lib/points';

/**
 * 结算页积分试算：告诉用户「本单最多能用多少积分、能抵多少钱」。
 * POST /api/account/points/quote
 * body: { items: [{ slug, qty, price }] }  —— 只用于算金额，不下单
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, reason: 'UNAUTHORIZED' });
    }
    const body = await req.json();
    const items: Array<{ slug: string; qty: number; price: number }> = Array.isArray(body.items)
      ? body.items
      : [];

    const rule = await getPointRule();
    if (!rule.enabled) {
      return NextResponse.json({ ok: false, reason: 'DISABLED', rule });
    }

    const slugs = items.map((i) => i.slug).filter(Boolean);
    const products: Array<{
      id: string;
      slug: string;
      usePoints: boolean;
      maxPointUse: number;
    }> = slugs.length
      ? await prisma.product.findMany({
          where: { slug: { in: slugs }, status: 'active' },
          select: { id: true, slug: true, usePoints: true, maxPointUse: true },
        })
      : [];
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    const lines = items.map((i) => {
      const p = bySlug.get(i.slug);
      return {
        productId: p?.id ?? i.slug,
        amount: Math.max(0, Math.round(Number(i.price) || 0)) * Math.max(1, Math.floor(Number(i.qty) || 1)),
        usePoints: p?.usePoints ?? true,
        maxPointUse: p?.maxPointUse ?? 0,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { points: true },
    });
    const userPoints = user?.points ?? 0;

    const quote = calcRedeemQuote(subtotal, lines, userPoints, rule);

    return NextResponse.json({
      ok: true,
      rule,
      userPoints,
      subtotal,
      maxPoints: quote.maxPoints,
      maxDiscount: quote.maxDiscount,
      eligible: quote.eligible,
      reason: quote.reason,
      // 单个积分能抵多少钱（显示用）
      onePointValue: pointsToDiscount(1, rule),
    });
  } catch (e) {
    console.error('points quote error', e);
    return NextResponse.json({ ok: false, reason: 'SERVER_ERROR' }, { status: 500 });
  }
}
