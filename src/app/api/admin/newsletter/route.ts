import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, HttpError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isLiveMail } from '@/lib/mailer';

/** 鉴权失败返回 401/403 而不是 500（见 lib/auth.ts 的 HttpError 注释） */
async function guard() {
  try {
    await requireAdmin();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'UNKNOWN' },
      { status: e instanceof HttpError ? e.status : 500 }
    );
  }
  return null;
}

/** 后台：订阅列表（含统计） */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const [subs, total, active, campaigns] = await Promise.all([
    prisma.newsletterSub.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
    prisma.newsletterSub.count(),
    prisma.newsletterSub.count({ where: { status: 'active' } }),
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  return NextResponse.json({
    subs,
    total,
    active,
    campaigns,
    mailLive: isLiveMail(), // false = 未配 API key，点发送只记日志不发真信
  });
}

/** 后台：删除订阅记录 */
export async function DELETE(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
  await prisma.newsletterSub.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
