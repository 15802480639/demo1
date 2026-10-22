import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** 解析 JSON 数组字段（商品 id 列表），容错 */
function parseIds(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, any>;
  const code = String(body.code ?? '');
  const sub = Number(body.subtotal) || 0;
  // 购物车商品（用于计算「适用商品」小计）
  const items: { slug: string; price: number; qty: number }[] = Array.isArray(body.items)
    ? body.items.map((it: any) => ({
        slug: String(it.slug ?? ''),
        price: Number(it.price) || 0,
        qty: Math.max(1, Math.floor(Number(it.qty) || 1)),
      }))
    : [];
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
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return NextResponse.json({ ok: false, error: 'USED_UP' });
  }

  // 适用商品：productIds 为空 = 全场通用；否则只对购物车里的适用商品生效
  const ids = parseIds(coupon.productIds);
  let applicableSub = sub;
  if (ids.length > 0) {
    const prods = await prisma.product.findMany({
      where: { slug: { in: items.map((i) => i.slug) } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map<string, string>(prods.map((p) => [p.slug, p.id]));
    const idSet = new Set<string>(ids);
    applicableSub = items
      .filter((i) => {
        const pid = idBySlug.get(i.slug);
        return typeof pid === 'string' && idSet.has(pid);
      })
      .reduce((sum, i) => sum + i.price * i.qty, 0);
    if (applicableSub <= 0) {
      return NextResponse.json({ ok: false, error: 'NOT_APPLICABLE' });
    }
  }

  if (coupon.minSpend > applicableSub) {
    return NextResponse.json({ ok: false, error: 'MIN_SPEND', minSpend: coupon.minSpend });
  }
  const discount =
    coupon.type === 'percent'
      ? Math.round((applicableSub * coupon.value) / 100)
      : Math.min(coupon.value, applicableSub);
  return NextResponse.json({
    ok: true,
    discount,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    applicableOnly: ids.length > 0,
  });
}
