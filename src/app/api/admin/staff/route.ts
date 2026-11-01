import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, HttpError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { STAFF_ROLE_LABELS, normalizeStaffRole } from '@/lib/permissions';

// GET /api/admin/staff —— 管理员列表 + 客服列表 + 权限档位定义
// PUT  /api/admin/staff —— 调整管理员权限档位 { userId, staffRole }
export async function GET() {
  try {
    await requirePermission('staff.manage');
    const [admins, agents] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'admin' },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          staffRole: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.chatAgent.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          active: true,
          permissions: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return NextResponse.json({
      admins: admins.map((a) => ({
        ...a,
        staffRole: normalizeStaffRole(a.staffRole),
        createdAt: a.createdAt.toISOString(),
      })),
      agents: agents.map((a) => ({
        ...a,
        lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
      })),
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[staff] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let actor: ReturnType<typeof actorFromSession> = null;
  try {
    const session = await requirePermission('staff.manage');
    actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });

    const b = await req.json();
    const userId = String(b?.userId ?? '').trim();
    const staffRole = String(b?.staffRole ?? '').trim();
    if (!userId || !staffRole) {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, username: true, email: true, staffRole: true },
    });
    if (!target || target.role !== 'admin') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const normalized = normalizeStaffRole(staffRole);

    // 🔴 防锁死护栏（重要）：
    //    staff.manage 只有 owner 有。若 owner 把「自己」降级，就再也没人能改回来
    //    → 后台权限被永久锁死（只能进数据库手改）。
    //    同理，若是「最后一个 owner」被降级，也必须拦住。
    const ownerCount = await prisma.user.count({
      where: { role: 'admin', staffRole: 'owner' },
    });
    const targetWasOwner = normalizeStaffRole(target.staffRole) === 'owner';
    if (targetWasOwner && normalized !== 'owner') {
      if (target.id === session.id) {
        return NextResponse.json(
          { error: 'cannot_downgrade_self' },
          { status: 400 }
        );
      }
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'last_owner' },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { staffRole: normalized } });

    await logAudit({
      action: 'staff.role.update',
      actor,
      targetType: 'staff',
      targetId: userId,
      summary: `관리자 권한 변경: ${target.name || target.username || target.email || userId} → ${normalized}`,
      detail: {
        userId,
        from: target.staffRole,
        to: normalized,
        label: STAFF_ROLE_LABELS[normalized],
      },
      ip: clientIp(req),
    });

    return NextResponse.json({ ok: true, staffRole: normalized });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[staff] update error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
