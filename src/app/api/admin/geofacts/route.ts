import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GEO 实体档案 CRUD。
 * 数据源是 GeoFact 表，输出到 llms.txt / llms-full.txt / Organization JSON-LD。
 */

const KINDS = ['fact', 'claim', 'differentiator', 'audience', 'shipping', 'payment', 'contact'];
const LOCALES = ['', 'ko', 'zh', 'en'];

function pick(v: unknown, allowed: string[], dflt: string): string {
  const s = String(v ?? '').trim();
  return allowed.includes(s) ? s : dflt;
}

export async function GET() {
  await requireAdmin();
  const facts = await prisma.geoFact.findMany({
    orderBy: [{ kind: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ facts, kinds: KINDS });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const label = String(b.label ?? '').trim().slice(0, 200);
  const value = String(b.value ?? '').trim().slice(0, 2000);
  if (!label || !value) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const fact = await prisma.geoFact.create({
    data: {
      kind: pick(b.kind, KINDS, 'fact'),
      label,
      value,
      locale: pick(b.locale, LOCALES, ''),
      order: Number(b.order) || 0,
      status: b.status === 'draft' ? 'draft' : 'published',
    },
  });
  return NextResponse.json({ fact });
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
  const label = String(b.label ?? '').trim().slice(0, 200);
  const value = String(b.value ?? '').trim().slice(0, 2000);
  if (!label || !value) return NextResponse.json({ error: 'INVALID' }, { status: 400 });

  const fact = await prisma.geoFact.update({
    where: { id },
    data: {
      kind: pick(b.kind, KINDS, 'fact'),
      label,
      value,
      locale: pick(b.locale, LOCALES, ''),
      order: Number(b.order) || 0,
      status: b.status === 'draft' ? 'draft' : 'published',
    },
  });
  return NextResponse.json({ fact });
}

export async function DELETE(req: NextRequest) {
  await requireAdmin();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'NO_ID' }, { status: 400 });
  await prisma.geoFact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}