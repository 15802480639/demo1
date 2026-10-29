import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, HttpError } from '@/lib/auth';
import { hashCsPassword } from '@/lib/cs-auth';

// PATCH /api/admin/support-agents/[id] —— 改密码 / 改名 / 启用停用
// DELETE /api/admin/support-agents/[id] —— 删除账号
//
// 停用（active=false）优于删除：停用后无法登录，但历史消息与已读游标保留，
// 便于事后追溯是谁接待的会话。

function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (e) {
    return fail(e);
  }

  const { id } = await params;
  const agent = await prisma.chatAgent.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const data: any = {};
  if (typeof body.displayName === 'string' && body.displayName.trim()) {
    data.displayName = body.displayName.trim().slice(0, 60);
  }
  if (typeof body.active === 'boolean') {
    data.active = body.active;
  }
  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 });
    }
    data.passwordHash = await hashCsPassword(body.password);
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const updated = await prisma.chatAgent.update({
    where: { id },
    data,
    select: { id: true, username: true, displayName: true, active: true },
  });
  return NextResponse.json({ ok: true, agent: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (e) {
    return fail(e);
  }

  const { id } = await params;
  const agent = await prisma.chatAgent.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  // 已读游标随账号一起清掉（外键级联在 ChatReadCursor 上是 conversationId，
  // staffId 是普通字符串，需手动清理）
  await prisma.chatReadCursor.deleteMany({ where: { staffId: `agent:${id}` } });
  await prisma.chatAgent.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
