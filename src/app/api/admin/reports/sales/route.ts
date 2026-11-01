import { NextResponse } from 'next/server';
import { requirePermission, HttpError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/reports/sales?range=7d|30d|90d|all
// 返回按天聚合的销售数据（供报表页展示）
export async function GET(req: Request) {
  try {
    await requirePermission('reports.view');
    const sp = new URL(req.url).searchParams;
    const range = sp.get('range') ?? '30d';
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
    const since = days
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() - days);
          d.setHours(0, 0, 0, 0);
          return d;
        })()
      : null;

    const orders = await prisma.order.findMany({
      where: {
        ...(since ? { createdAt: { gte: since } } : {}),
        status: { notIn: ['cancelled', 'refunded'] },
      },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
      take: 50000,
    });

    const newUsers = await prisma.user.findMany({
      where: { role: 'customer', ...(since ? { createdAt: { gte: since } } : {}) },
      select: { createdAt: true },
      take: 50000,
    });

    const byDay = new Map<
      string,
      { orders: number; items: number; revenue: number; newCustomers: number }
    >();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

    for (const o of orders) {
      const k = ymd(o.createdAt);
      const cur = byDay.get(k) ?? { orders: 0, items: 0, revenue: 0, newCustomers: 0 };
      cur.orders += 1;
      cur.items += o.items.reduce((s, i) => s + i.quantity, 0);
      cur.revenue += o.total;
      byDay.set(k, cur);
    }
    for (const u of newUsers) {
      const k = ymd(u.createdAt);
      const cur = byDay.get(k) ?? { orders: 0, items: 0, revenue: 0, newCustomers: 0 };
      cur.newCustomers += 1;
      byDay.set(k, cur);
    }

    const rows = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, r]) => ({
        date,
        orders: r.orders,
        items: r.items,
        revenue: r.revenue,
        aov: r.orders ? Math.round(r.revenue / r.orders) : 0,
        newCustomers: r.newCustomers,
      }));

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
    const totalItems = rows.reduce((s, r) => s + r.items, 0);

    return NextResponse.json({
      range,
      rows,
      summary: {
        revenue: totalRevenue,
        orders: totalOrders,
        items: totalItems,
        aov: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
        newCustomers: newUsers.length,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('[reports/sales] error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
