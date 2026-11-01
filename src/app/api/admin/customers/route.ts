import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiFail } from '@/lib/api-fail';

export async function GET() {
  try {
    await requirePermission('customers.view');
    const users = await prisma.user.findMany({
      where: { role: 'customer' },
      orderBy: { createdAt: 'desc' },
      include: {
        orders: { select: { total: true } },
        invitedBy: { select: { inviteCode: true, username: true } },
      },
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
      inviteCode: u.inviteCode,
      uplineInviteCode: u.invitedBy?.inviteCode ?? null,
      uplineUsername: u.invitedBy?.username ?? null,
    }));
    return NextResponse.json({ customers });
  } catch (e) {
    return apiFail(e);
  }
}
