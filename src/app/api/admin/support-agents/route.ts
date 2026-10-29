import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, HttpError } from '@/lib/auth';
import { hashCsPassword } from '@/lib/cs-auth';

// GET /api/admin/support-agents —— 客服账号列表
// POST /api/admin/support-agents —— 新建客服账号
//
// 账号体系与商城 User 表完全隔离：这里建的是 ChatAgent，
// 只能登录 /cs 的 H5 客服台，进不了 /admin 后台，也进不了商城前台。

function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return fail(e);
  }

  const agents = await prisma.chatAgent.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      displayName: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    agents: agents.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
    })),
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return fail(e);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim();
  const displayName = String(body.displayName ?? '').trim();
  const password = String(body.password ?? '');

  if (!username || !displayName || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  // 账号名规范：3~32 位，字母数字下划线，与商城 username 规则保持一致的宽松度
  if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    return NextResponse.json({ error: 'bad_username' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'weak_password' }, { status: 400 });
  }

  const exists = await prisma.chatAgent.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 });
  }

  const agent = await prisma.chatAgent.create({
    data: {
      username,
      displayName,
      passwordHash: await hashCsPassword(password),
      active: true,
    },
    select: { id: true, username: true, displayName: true, active: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    agent: { ...agent, createdAt: agent.createdAt.toISOString() },
  });
}
