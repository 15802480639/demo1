import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let u;
  try {
    u = await requireUser();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const { id } = await params;
  const b = await req.json();
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== u.id) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const isDefault = b.isDefault === true;
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: u.id, isDefault: true },
      data: { isDefault: false },
    });
  }
  const patch: Record<string, unknown> = {};
  if (b.name !== undefined) patch.name = b.name;
  if (b.line1 !== undefined) patch.line1 = b.line1;
  if (b.line2 !== undefined) patch.line2 = b.line2;
  if (b.city !== undefined) patch.city = b.city;
  if (b.state !== undefined) patch.state = b.state;
  if (b.country !== undefined) patch.country = b.country;
  if (b.postalCode !== undefined) patch.postalCode = b.postalCode;
  if (b.phone !== undefined) patch.phone = b.phone;
  if (isDefault) patch.isDefault = true;
  else if (b.isDefault === false) patch.isDefault = false;

  const address = await prisma.address.update({ where: { id }, data: patch });
  return NextResponse.json({ address });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let u;
  try {
    u = await requireUser();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== u.id) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
