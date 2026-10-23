import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adjustPoints } from '@/lib/points';

/**
 * 后台手动给客户加减积分。
 * POST /api/admin/customers/[id]/points
 * body: { amount: number(正加负减), remark?: string }
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
    const amount = Math.trunc(Number(body.amount));
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'bad_amount' }, { status: 400 });
    }
    const remark = String(body.remark ?? '').trim() || null;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const result = await adjustPoints({
      userId: id,
      amount,
      type: amount > 0 ? 'admin_add' : 'admin_minus',
      remark,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('admin points adjust error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
