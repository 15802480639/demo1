import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const events = await prisma.eventItem.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const b = await req.json();
    const title = String(b.title ?? '').trim();
    if (!title) return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    const event = await prisma.eventItem.create({
      data: {
        title,
        titleZh: String(b.titleZh ?? '').trim() || null,
        subtitle: String(b.subtitle ?? '').trim() || null,
        subtitleZh: String(b.subtitleZh ?? '').trim() || null,
        badge: String(b.badge ?? '').trim() || null,
        imageUrl: String(b.imageUrl ?? '').trim() || null,
        href: String(b.href ?? '').trim() || null,
        order: Number(b.order) || 0,
        status: b.status === 'draft' ? 'draft' : 'published',
      },
    });
    return NextResponse.json({ ok: true, event });
  } catch (e) {
    console.error('create event error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
