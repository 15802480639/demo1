import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAdmin();
  const rows = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

/** 批量 upsert。逐条独立写入，key 不冲突，不会覆盖未提交的字段。 */
export async function PUT(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  const patch = (b.settings ?? {}) as Record<string, unknown>;
  const keys = Object.keys(patch).slice(0, 50);
  if (keys.length === 0) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const saved: string[] = [];
  for (const key of keys) {
    if (!/^[a-z0-9_.-]{1,64}$/i.test(key)) continue;
    // info.*（隐私政策/服务条款等页面正文）放开到 10 万字，法务长文也能存；其余键维持 8000
    const maxLen = key.startsWith('info.') ? 100000 : 8000;
    const value = String(patch[key] ?? '').slice(0, maxLen);
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    saved.push(key);
  }
  return NextResponse.json({ ok: true, saved });
}