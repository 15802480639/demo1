import { NextResponse } from 'next/server';
import {
  prisma,
  createSessionToken,
  sessionCookieOpts,
  SESSION_COOKIE,
  verifyPassword,
  type SessionUser,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').toLowerCase().trim();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const token = createSessionToken(sessionUser);
    const res = NextResponse.json({ ok: true, user: sessionUser });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOpts());
    return res;
  } catch (e) {
    console.error('login error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
