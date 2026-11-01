import { NextRequest, NextResponse } from 'next/server';
import { HttpError, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { apiFail } from '@/lib/api-fail';

export async function GET() {
  try {
    await requirePermission('coupons.edit');
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ coupons });
  } catch (e) {
    return apiFail(e);
  }
}

/** 解析适用商品 id 列表：数组或 JSON 字符串都接受，空 = 全场通用 */
function parseProductIds(v: unknown): string {
  let arr: unknown = v;
  if (typeof v === 'string') {
    try {
      arr = JSON.parse(v);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return '[]';
  return JSON.stringify(arr.filter((x) => typeof x === 'string' && x).slice(0, 500));
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('coupons.edit');
    const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });
    const b = await req.json();
    const code = String(b.code || '').trim().toUpperCase();
    if (!code || !(Number(b.value) > 0)) {
      return NextResponse.json({ error: 'INVALID' }, { status: 400 });
    }
    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: b.type === 'fixed' ? 'fixed' : 'percent',
        value: Number(b.value),
        minSpend: Number(b.minSpend) || 0,
        productIds: parseProductIds(b.productIds),
        startsAt: b.startsAt ? new Date(b.startsAt) : null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
        active: b.active !== false,
      },
    });
        // ---- 操作日志 ----
      await logAudit({
        action: 'coupon.create',
        actor,
        targetType: 'coupon',
        summary: `쿠폰 생성: ${coupon.code}`,
        detail: { code: coupon.code, type: coupon.type, value: coupon.value },
        ip: clientIp(req),
      });
    return NextResponse.json({ coupon });
  } catch (e) {
    return apiFail(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requirePermission('coupons.edit');
    const b = await req.json();
    const id = String(b.id);
    if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: String(b.code).trim().toUpperCase(),
        type: b.type === 'fixed' ? 'fixed' : 'percent',
        value: Number(b.value),
        minSpend: Number(b.minSpend) || 0,
        productIds: parseProductIds(b.productIds),
        startsAt: b.startsAt ? new Date(b.startsAt) : null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
        active: b.active !== false,
      },
    });
    return NextResponse.json({ coupon });
  } catch (e) {
    return apiFail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission('coupons.edit');
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiFail(e);
  }
}
