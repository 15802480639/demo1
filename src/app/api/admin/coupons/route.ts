import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAdmin();
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
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
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
      active: b.active !== false,
    },
  });
  return NextResponse.json({ coupon });
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
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
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
      active: b.active !== false,
    },
  });
  return NextResponse.json({ coupon });
}

export async function DELETE(req: NextRequest) {
  await requireAdmin();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
