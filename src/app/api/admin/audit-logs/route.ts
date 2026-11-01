import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, HttpError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/audit-logs?actorId=&action=&targetType=&q=&limit=
// 只读接口：只允许有 audit.view 权限的人看
export async function GET(req: NextRequest) {
  try {
    await requirePermission('audit.view');
    const sp = req.nextUrl.searchParams;
    const actorId = sp.get('actorId') || undefined;
    const action = sp.get('action') || undefined;
    const targetType = sp.get('targetType') || undefined;
    const q = (sp.get('q') || '').trim();
    const limit = Math.min(Number(sp.get('limit')) || 200, 500);

    const where: any = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: 'insensitive' } },
              { actorName: { contains: q, mode: 'insensitive' } },
              { targetId: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 操作人去重（用于筛选下拉）
    const actors = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, username: true, email: true, staffRole: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        summary: l.summary,
        detail: l.detail,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      })),
      actors,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[audit-logs] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
