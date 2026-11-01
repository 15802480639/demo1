import { NextResponse } from 'next/server';
import { requirePermission, HttpError } from '@/lib/auth';
import {
  getUnreadNotifications,
  markNotificationsRead,
} from '@/lib/admin-notify';

// GET /api/admin/notifications —— 当前管理员的未读通知
// POST /api/admin/notifications —— 标记已读（body: { ids?: string[] }，不传 = 全部）

function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error('[notifications] error:', e);
  return NextResponse.json({ error: 'server_error' }, { status: 500 });
}

export async function GET() {
  try {
    const s = await requirePermission('dashboard.view');
    const data = await getUnreadNotifications(s.id);
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const s = await requirePermission('dashboard.view');
    let ids: string[] | undefined;
    try {
      const b = await req.json();
      if (Array.isArray(b?.ids)) ids = b.ids.map((x: unknown) => String(x)).slice(0, 200);
    } catch {
      ids = undefined;
    }
    const n = await markNotificationsRead(s.id, ids);
    return NextResponse.json({ ok: true, marked: n });
  } catch (e) {
    return fail(e);
  }
}
