import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CS_SESSION_COOKIE,
  createCsSessionToken,
  csSessionCookieOpts,
  hashCsPassword,
  verifyCsPassword,
} from '@/lib/cs-auth';
import { isSecureRequest } from '@/lib/auth';

// POST /api/cs/login —— H5 客服登录
//
// 账号体系完全独立于商城：只认 ChatAgent 表，商城 User 表（含 admin）在此一律无效。
// 成功 → 下发 cs_session Cookie（HttpOnly，与后台 ws_session 互不干扰）。
export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  if (!username || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const agent = await prisma.chatAgent.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, passwordHash: true, active: true },
  });
  // ⚠️ 账号不存在与密码错误返回同一个错误码，避免暴露"该账号存在"
  if (!agent || !agent.passwordHash) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }
  const ok = await verifyCsPassword(password, agent.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }
  if (!agent.active) {
    return NextResponse.json({ error: 'agent_disabled' }, { status: 403 });
  }

  await prisma.chatAgent.update({
    where: { id: agent.id },
    data: { lastLoginAt: new Date() },
  });

  const token = createCsSessionToken({
    id: agent.id,
    username: agent.username,
    displayName: agent.displayName,
  });
  const res = NextResponse.json({
    ok: true,
    agent: { id: agent.id, username: agent.username, displayName: agent.displayName },
  });
  res.cookies.set(CS_SESSION_COOKIE, token, csSessionCookieOpts(isSecureRequest(req)));
  return res;
}
