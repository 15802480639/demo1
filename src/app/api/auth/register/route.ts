import { NextResponse } from 'next/server';
import {
  prisma,
  createSessionToken,
  sessionCookieOpts,
  isSecureRequest,
  SESSION_COOKIE,
  hashPassword,
  type SessionUser,
} from '@/lib/auth';
import { generateUniqueInviteCode, resolveUpline } from '@/lib/invite';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? '').trim();
    const email = String(body.email ?? '').toLowerCase().trim();
    const password = String(body.password ?? '');
    const name = body.name ? String(body.name).trim() : null;
    // 选填：上级邀请码（用于建立 1 级推荐关系）
    const uplineInput = body.inviteCode !== undefined ? body.inviteCode : body.invitedByCode;
    const uplineId = await resolveUpline(uplineInput);

    // 账号必填：2-20 位，不能带空格
    if (!username || username.length < 2 || username.length > 20 || /\s/.test(username)) {
      return NextResponse.json({ error: 'invalid_username' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    }
    // 邮箱选填：填了才校验格式
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: 'email_taken' }, { status: 409 });
      }
    }

    // 生成专属邀请码（用于推广）；若填了有效上级码则建立 1 级关系
    const inviteCode = await generateUniqueInviteCode();

    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        name: name || username,
        passwordHash: await hashPassword(password),
        role: 'customer',
        inviteCode,
        invitedById: uplineId,
      },
    });

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      inviteCode: user.inviteCode,
    };
    const token = createSessionToken(sessionUser);
    const res = NextResponse.json({ ok: true, user: sessionUser });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOpts(isSecureRequest(req)));
    return res;
  } catch (e) {
    console.error('register error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
