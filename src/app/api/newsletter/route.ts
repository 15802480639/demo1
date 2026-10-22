import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** 订阅电子报（公开接口）：邮箱落库，重复订阅返回已订阅 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const locale = String(body.locale ?? '').slice(0, 10);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'INVALID_EMAIL' }, { status: 400 });
  }
  const existing = await prisma.newsletterSub.findUnique({ where: { email } });
  if (existing) {
    // 已订阅过：退订过的重新激活
    if (existing.status !== 'active') {
      await prisma.newsletterSub.update({ where: { email }, data: { status: 'active', locale } });
    }
    return NextResponse.json({ ok: true, already: true });
  }
  await prisma.newsletterSub.create({ data: { email, locale } });
  return NextResponse.json({ ok: true, already: false });
}
