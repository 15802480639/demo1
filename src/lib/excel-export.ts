// Excel 导出 —— 订单 / 会员 / 销售报表
//
// ⭐ 为什么导出也用 xlsx 而不是 CSV：
//   运营直接拿到能看的表格（带表头样式、金额格式），不用再手工转格式。
//   与导入共用 exceljs，依赖只有一份。
//
// ⚠️ 金额一律用「₩ + 千分位」文本格式：
//   Excel 里数字格式容易在韩文/中文 locale 下被二次解释，
//   导出的数值列统一写字符串最稳（运营要的是"能看能核"，不是"能再算"）。

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';

export type ExportRange = '7d' | '30d' | '90d' | 'all';

export function rangeStart(range: ExportRange): Date | null {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function krw(n: number): string {
  return `₩${Math.round(n).toLocaleString('en-US')}`;
}

function ymd(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 给工作表加表头样式 */
function styleSheet(ws: ExcelJS.Worksheet, widths: number[]) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

/** 导出订单 */
export async function exportOrders(
  range: ExportRange,
  statusFilter?: string | null
): Promise<Buffer> {
  const since = rangeStart(range);
  const orders = await prisma.order.findMany({
    where: {
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true, user: true, address: true },
    take: 20000,
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('orders');
  ws.addRow([
    '주문번호',
    '주문일시',
    '상태',
    '고객',
    '이메일',
    '연락처',
    '수취인',
    '국가',
    '주소',
    '상품명',
    '옵션',
    '수량',
    '단가',
    '소계',
    '할인',
    '적립사용',
    '적립차감',
    '배송비',
    '총결제',
    '쿠폰',
    '택배사',
    '운송장번호',
  ]);
  styleSheet(ws, [20, 20, 12, 16, 26, 16, 16, 10, 40, 34, 26, 8, 14, 14, 12, 12, 12, 10, 14, 12, 14, 20]);

  for (const o of orders) {
    const addr = o.address;
    ws.addRow([
      o.orderNo,
      ymd(o.createdAt),
      o.status,
      o.user?.name ?? o.user?.username ?? '',
      o.user?.email ?? '',
      addr?.phone ?? '',
      addr?.name ?? '',
      addr?.country ?? '',
      addr
        ? [addr.state, addr.city, addr.line1, addr.line2, addr.postalCode]
            .filter(Boolean)
            .join(' ')
        : '',
      o.items.map((i) => i.name).join(' / '),
      o.items.map((i) => i.skuLabel ?? '').filter(Boolean).join(' / '),
      o.items.reduce((s, i) => s + i.quantity, 0),
      krw(o.items.length ? o.items[0].price : 0),
      krw(o.subtotal),
      krw(o.discount),
      String(o.pointsUsed ?? 0),
      krw(o.pointsDiscount ?? 0),
      krw(o.shippingFee),
      krw(o.total),
      o.couponCode ?? '',
      o.carrier ?? '',
      o.trackingNo ?? '',
    ]);
  }

  // 合计行
  const total = orders.reduce((s, o) => s + o.total, 0);
  ws.addRow([]);
  ws.addRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '합계', '', '', '', '', krw(total)]);

  return toBuffer(wb);
}

/** 导出会员 */
export async function exportCustomers(range: ExportRange): Promise<Buffer> {
  const since = rangeStart(range);
  const users = await prisma.user.findMany({
    where: { role: 'customer', ...(since ? { createdAt: { gte: since } } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      orders: { select: { total: true, status: true } },
      invitedBy: { select: { username: true, inviteCode: true } },
    },
    take: 20000,
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('customers');
  ws.addRow([
    '회원ID',
    '아이디',
    '이름',
    '이메일',
    '가입일',
    '주문수',
    '완료주문',
    '총구매액',
    '적립금',
    '내초대코드',
    '상위초대코드',
    '상위아이디',
  ]);
  styleSheet(ws, [26, 16, 18, 26, 14, 10, 10, 16, 12, 16, 16, 16]);

  for (const u of users) {
    const paid = u.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
    ws.addRow([
      u.id,
      u.username ?? '',
      u.name ?? '',
      u.email ?? '',
      ymd(u.createdAt),
      u.orders.length,
      paid.length,
      krw(paid.reduce((s, o) => s + o.total, 0)),
      String(u.points ?? 0),
      u.inviteCode ?? '',
      u.invitedBy?.inviteCode ?? '',
      u.invitedBy?.username ?? '',
    ]);
  }

  return toBuffer(wb);
}

/** 销售报表（按天） */
export async function exportSalesReport(range: ExportRange): Promise<Buffer> {
  const since = rangeStart(range);
  const orders = await prisma.order.findMany({
    where: {
      ...(since ? { createdAt: { gte: since } } : {}),
      status: { notIn: ['cancelled', 'refunded'] },
    },
    orderBy: { createdAt: 'asc' },
    include: { items: true },
    take: 50000,
  });

  const byDay = new Map<
    string,
    { orders: number; items: number; revenue: number; newCustomers: number }
  >();
  for (const o of orders) {
    const k = ymd(o.createdAt);
    const cur = byDay.get(k) ?? { orders: 0, items: 0, revenue: 0, newCustomers: 0 };
    cur.orders += 1;
    cur.items += o.items.reduce((s, i) => s + i.quantity, 0);
    cur.revenue += o.total;
    byDay.set(k, cur);
  }

  // 新增会员
  const newUsers = await prisma.user.findMany({
    where: { role: 'customer', ...(since ? { createdAt: { gte: since } } : {}) },
    select: { createdAt: true },
    take: 50000,
  });
  for (const u of newUsers) {
    const k = ymd(u.createdAt);
    const cur = byDay.get(k) ?? { orders: 0, items: 0, revenue: 0, newCustomers: 0 };
    cur.newCustomers += 1;
    byDay.set(k, cur);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('sales');
  ws.addRow(['날짜', '주문수', '수량', '매출액', '평균주문금액', '신규회원']);
  styleSheet(ws, [14, 10, 10, 16, 16, 10]);

  const days = [...byDay.keys()].sort();
  let tOrders = 0;
  let tItems = 0;
  let tRevenue = 0;
  for (const d of days) {
    const r = byDay.get(d)!;
    tOrders += r.orders;
    tItems += r.items;
    tRevenue += r.revenue;
    ws.addRow([
      d,
      r.orders,
      r.items,
      krw(r.revenue),
      krw(r.orders ? r.revenue / r.orders : 0),
      r.newCustomers,
    ]);
  }
  ws.addRow([]);
  ws.addRow([
    '합계',
    String(tOrders),
    String(tItems),
    krw(tRevenue),
    krw(tOrders ? tRevenue / tOrders : 0),
    String(newUsers.length),
  ]);

  return toBuffer(wb);
}
