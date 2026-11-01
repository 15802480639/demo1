import { NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateOrderStatus, ORDER_STATUSES } from '@/lib/services/order-service';
import { logAudit, clientIp, actorFromSession } from '@/lib/audit';
import { apiFail } from '@/lib/api-fail';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission('orders.edit');
    const actor = actorFromSession({ ...session, staffRole: session.staffRole ?? 'owner' });
    try {
      const { id } = await params;
      const body = await req.json();
      const patch: Record<string, unknown> = {};

      // 记录改前的值，审计日志里写「从 A 改成 B」
      const before = await prisma.order.findUnique({
        where: { id },
        select: { status: true, orderNo: true, trackingNo: true, carrier: true },
      });

      if (body.status) {
        if (!ORDER_STATUSES.includes(body.status)) {
          return NextResponse.json({ error: 'bad_status' }, { status: 400 });
        }
        patch.status = body.status;
      }
      if (body.trackingNo !== undefined) patch.trackingNo = body.trackingNo || null;
      if (body.carrier !== undefined) patch.carrier = body.carrier || null;
      // 是否已联系（客服跟进标记）
      if (typeof body.contacted === 'boolean') {
        patch.contacted = body.contacted;
        patch.contactedAt = body.contacted ? new Date() : null;
      }

      // 物流信息同步到 Shipment
      if (body.trackingNo !== undefined || body.carrier !== undefined) {
        await prisma.shipment.upsert({
          where: { orderId: id },
          update: {
            carrier: body.carrier || null,
            trackingNo: body.trackingNo || null,
            status: 'shipped',
            shippedAt: new Date(),
          },
          create: {
            orderId: id,
            carrier: body.carrier || null,
            trackingNo: body.trackingNo || null,
            status: 'shipped',
            shippedAt: new Date(),
          },
        });
      }

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ ok: true });
      }

      // 状态变更必须走 updateOrderStatus —— 积分的发放（→paid）与扣回（→refunded/cancelled）
      // 都挂在这个函数上。直接 prisma.order.update 会绕过积分结算。
      let order;
      if (patch.status) {
        order = await updateOrderStatus(id, String(patch.status));
        // 其余字段（物流、联系标记）单独更新
        const rest = { ...patch };
        delete rest.status;
        if (Object.keys(rest).length > 0) {
          order = await prisma.order.update({ where: { id }, data: rest });
        }
      } else {
        order = await prisma.order.update({ where: { id }, data: patch });
      }
      // ---- 操作日志：状态 / 物流 / 联系标记分开记，便于事后追溯 ----
      const orderNo = before?.orderNo ?? order.orderNo;
      if (patch.status && before && before.status !== patch.status) {
        await logAudit({
          action: 'order.status.update',
          actor,
          targetType: 'order',
          targetId: id,
          summary: `주문 ${orderNo} 상태 변경: ${before.status} → ${patch.status}`,
          detail: { orderNo, from: before.status, to: patch.status },
          ip: clientIp(req),
        });
      }
      if (patch.trackingNo !== undefined || patch.carrier !== undefined) {
        await logAudit({
          action: 'order.logistics.update',
          actor,
          targetType: 'order',
          targetId: id,
          summary: `주문 ${orderNo} 배송 정보 수정 (택배사 ${patch.carrier ?? '-'} / 운송장 ${patch.trackingNo ?? '-'})`,
          detail: {
            orderNo,
            carrierFrom: before?.carrier ?? null,
            carrierTo: patch.carrier ?? null,
            trackingFrom: before?.trackingNo ?? null,
            trackingTo: patch.trackingNo ?? null,
          },
          ip: clientIp(req),
        });
      }
      if (typeof patch.contacted === 'boolean') {
        await logAudit({
          action: 'order.contacted.update',
          actor,
          targetType: 'order',
          targetId: id,
          summary: `주문 ${orderNo} 고객 연락 처리: ${patch.contacted ? '연락함' : '미연락'}`,
          detail: { orderNo, contacted: patch.contacted },
          ip: clientIp(req),
        });
      }

      return NextResponse.json({ ok: true, order });
    } catch (e: any) {
      console.error('update order error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  } catch (e) {
    return apiFail(e);
  }
}
