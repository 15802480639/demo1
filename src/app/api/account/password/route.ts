import { NextRequest, NextResponse } from 'next/server';
import { requireUser, verifyPassword, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  let u;
  try {
    u = await requireUser();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const b = await req.json();
  const current = String(b.current || '');
  const next = String(b.next || '');
  if (next.length < 6) {
    return NextResponse.json({ error: 'PASSWORD_TOO_SHORT' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: u.id } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'NO_PASSWORD' }, { status: 400 });
  }
  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'WRONG_CURRENT' }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return NextResponse.json({ ok: true });
}
