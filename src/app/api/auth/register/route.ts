import { NextResponse } from 'next/server';
import {
  prisma,
  createSessionToken,
  sessionCookieOpts,
  SESSION_COOKIE,
  hashPassword,
  type SessionUser,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').toLowerCase().trim();
    const password = String(body.password ?? '');
    const name = body.name ? String(body.name).trim() : null;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { email, name, passwordHash: await hashPassword(password), role: 'customer' },
    });

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
    console.error('register error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
