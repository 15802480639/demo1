import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, HttpError } from '@/lib/auth';
import { hashCsPassword } from '@/lib/cs-auth';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { AGENT_ROLES, AGENT_ROLE_LABELS, normalizeAgentRole } from '@/lib/permissions';

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
  let session;
  try {
    session = await requirePermission('agents.manage');
  } catch (e) {
    return fail(e);
  }
  const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });

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
  // 客服权限档位（客服之间也分权：只接待 / 可查订单 / 可处理订单）
  if (typeof body.permissions === 'string') {
    const p = body.permissions.trim();
    if (p && !(AGENT_ROLES as readonly string[]).includes(p)) {
      return NextResponse.json({ error: 'bad_permissions' }, { status: 400 });
    }
    data.permissions = normalizeAgentRole(p);
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
    select: {
      id: true,
      username: true,
      displayName: true,
      active: true,
      permissions: true,
    },
  });

  // ---- 操作日志 ----
  const changes: string[] = [];
  if (data.displayName && data.displayName !== agent.displayName) {
    changes.push(`이름 ${agent.displayName} → ${data.displayName}`);
  }
  if (typeof data.active === 'boolean' && data.active !== agent.active) {
    changes.push(`상태 ${agent.active ? '재직' : '퇴직'} → ${data.active ? '재직' : '퇴직'}`);
  }
  if (data.permissions && data.permissions !== agent.permissions) {
    changes.push(
      `권한 ${agent.permissions} → ${data.permissions}`
    );
  }
  if (data.passwordHash) changes.push('비밀번호 변경');
  if (changes.length) {
    await logAudit({
      action: 'agent.update',
      actor,
      targetType: 'agent',
      targetId: id,
      summary: `상담원 계정 수정: ${agent.username} (${changes.join(', ')})`,
      detail: {
        username: agent.username,
        from: {
          displayName: agent.displayName,
          active: agent.active,
          permissions: agent.permissions,
        },
        to: {
          displayName: updated.displayName,
          active: updated.active,
          permissions: updated.permissions,
        },
        label: AGENT_ROLE_LABELS[normalizeAgentRole(updated.permissions)],
      },
      ip: clientIp(req),
    });
  }

  return NextResponse.json({ ok: true, agent: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('agents.manage');
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
