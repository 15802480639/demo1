import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPointRule, savePointRule } from '@/lib/points';

/** 后台积分规则：GET 读取 / PUT 保存 */
export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ rule: await getPointRule() });
}

export async function PUT(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const b = await req.json();
    const rule = await savePointRule({
      enabled: typeof b.enabled === 'boolean' ? b.enabled : undefined,
      earnPercent: b.earnPercent !== undefined ? Number(b.earnPercent) : undefined,
      minSpendForUse: b.minSpendForUse !== undefined ? Number(b.minSpendForUse) : undefined,
      pointsPerKrw: b.pointsPerKrw !== undefined ? Number(b.pointsPerKrw) : undefined,
      maxUsePercent: b.maxUsePercent !== undefined ? Number(b.maxUsePercent) : undefined,
    });
    return NextResponse.json({ ok: true, rule });
  } catch (e) {
    console.error('point rule save error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
