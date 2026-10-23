import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    where: { role: 'customer' },
    orderBy: { createdAt: 'desc' },
    include: { orders: { select: { total: true } } },
  });
  const customers = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
    points: u.points,
    orderCount: u.orders.length,
    spent: u.orders.reduce((sum, o) => sum + o.total, 0),
  }));
  return NextResponse.json({ customers });
}
