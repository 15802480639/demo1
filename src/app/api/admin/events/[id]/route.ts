import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const s = await getSession();
  return s && s.role === 'admin' ? s : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    const b = await req.json();
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'titleZh', 'subtitle', 'subtitleZh', 'badge', 'imageUrl', 'href'] as const) {
      if (b[k] !== undefined) data[k] = String(b[k]).trim() || null;
    }
    if (b.title !== undefined && !String(b.title).trim()) {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }
    if (b.order !== undefined) data.order = Number(b.order) || 0;
    if (b.status !== undefined) data.status = b.status === 'draft' ? 'draft' : 'published';
    const event = await prisma.eventItem.update({ where: { id }, data });
    return NextResponse.json({ ok: true, event });
  } catch (e) {
    console.error('update event error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  await prisma.eventItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
