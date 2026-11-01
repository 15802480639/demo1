import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiFail } from '@/lib/api-fail';

export async function GET(req: Request) {
  try {
    await requirePermission('referrals.view');

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { name: true, username: true } },
        invitedUsers: { select: { id: true } },
      },
    });

    const rows = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      inviteCode: u.inviteCode,
      upline: u.invitedBy ? (u.invitedBy.name ?? u.invitedBy.username) : null,
      uplineId: u.invitedById,
      inviteeCount: u.invitedUsers.length,
    }));

    const filtered = q
      ? rows.filter((r) =>
          [r.name, r.username, r.email, r.inviteCode, r.upline]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : rows;

    return NextResponse.json({ rows: filtered, total: rows.length });
  } catch (e) {
    return apiFail(e);
  }
}
