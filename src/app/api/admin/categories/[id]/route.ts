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
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.nameZh !== undefined)
      data.nameZh = String(body.nameZh).trim() || null;
    if (body.imageUrl !== undefined)
      data.imageUrl = String(body.imageUrl).trim() || null;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ ok: true, category });
  } catch (e) {
    console.error('update category error', e);
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
  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'in_use', message: '该分类下仍有商品或子分类' },
      { status: 409 },
    );
  }
}
