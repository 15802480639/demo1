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
    // 账号（username，大小写敏感）或邮箱（不区分大小写）都可以登录
    const rawAccount = String(body.account ?? body.email ?? '').trim();
    const password = String(body.password ?? '');

    if (!rawAccount || !password) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // 先按用户名精确找，找不到再按邮箱找
    let user = await prisma.user.findUnique({ where: { username: rawAccount } });
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: rawAccount.toLowerCase() },
      });
    }
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
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
