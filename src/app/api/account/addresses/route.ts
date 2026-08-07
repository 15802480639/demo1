import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const u = await requireUser();
    const addresses = await prisma.address.findMany({
      where: { userId: u.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ addresses });
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  let u;
  try {
    u = await requireUser();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const b = await req.json();
  if (!b.line1 || !b.city || !b.country || !b.postalCode) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const isDefault = b.isDefault === true;
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: u.id, isDefault: true },
      data: { isDefault: false },
    });
  }
  const count = await prisma.address.count({ where: { userId: u.id } });
  const address = await prisma.address.create({
    data: {
      userId: u.id,
      name: b.name || null,
      line1: b.line1,
      line2: b.line2 || null,
      city: b.city,
      state: b.state || null,
      country: b.country,
      postalCode: b.postalCode,
      phone: b.phone || null,
      isDefault: isDefault || count === 0,
    },
  });
  return NextResponse.json({ address });
}
