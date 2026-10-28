import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

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
}
