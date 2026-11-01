import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, HttpError } from '@/lib/auth';
import { exportOrders, exportCustomers, exportSalesReport, type ExportRange } from '@/lib/excel-export';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';

// GET /api/admin/export?type=orders|customers|sales&range=7d|30d|90d|all&status=xxx
// 返回 xlsx 文件流
export async function GET(req: NextRequest) {
  let actor: ReturnType<typeof actorFromSession> = null;
  try {
    const sp = req.nextUrl.searchParams;
    const type = sp.get('type') ?? 'orders';
    const range = (sp.get('range') ?? '30d') as ExportRange;
    const status = sp.get('status');

    let perm: 'orders.export' | 'data.export' =
      type === 'customers' || type === 'sales' ? 'data.export' : 'orders.export';
    const s = await requirePermission(perm);
    actor = actorFromSession({ ...s, staffRole: s.staffRole ?? 'owner' });

    let buf: Buffer;
    let filename: string;
    const stamp = new Date().toISOString().slice(0, 10);

    if (type === 'customers') {
      buf = await exportCustomers(range);
      filename = `webshopp-customers-${stamp}.xlsx`;
    } else if (type === 'sales') {
      buf = await exportSalesReport(range);
      filename = `webshopp-sales-${stamp}.xlsx`;
    } else {
      buf = await exportOrders(range, status);
      filename = `webshopp-orders-${stamp}.xlsx`;
    }

    await logAudit({
      action: type === 'customers' ? 'data.export' : 'order.export',
      actor,
      targetType: type,
      summary: `导出 ${type}（范围 ${range}）`,
      detail: { type, range, status: status ?? null },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[export] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
