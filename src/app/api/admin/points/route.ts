import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { getPointRule, savePointRule } from '@/lib/points';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { apiFail } from '@/lib/api-fail';

/** 后台积分规则：GET 读取 / PUT 保存 */
export async function GET() {
  try {
    await requirePermission('points.view');
    return NextResponse.json({ rule: await getPointRule() });
  } catch (e) {
    return apiFail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requirePermission('points.manage');
    const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });
    try {
      const b = await req.json();
      const rule = await savePointRule({
        enabled: typeof b.enabled === 'boolean' ? b.enabled : undefined,
        earnPercent: b.earnPercent !== undefined ? Number(b.earnPercent) : undefined,
        minSpendForUse: b.minSpendForUse !== undefined ? Number(b.minSpendForUse) : undefined,
        pointsPerKrw: b.pointsPerKrw !== undefined ? Number(b.pointsPerKrw) : undefined,
        maxUsePercent: b.maxUsePercent !== undefined ? Number(b.maxUsePercent) : undefined,
      });
          // ---- 操作日志 ----
      await logAudit({
        action: 'points.rule.update',
        actor,
        targetType: 'setting',
        summary: `적립 규칙 변경`,
        detail: { rule },
        ip: clientIp(req),
      });
      return NextResponse.json({ ok: true, rule });
    } catch (e) {
      console.error('point rule save error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  } catch (e) {
    return apiFail(e);
  }
}
