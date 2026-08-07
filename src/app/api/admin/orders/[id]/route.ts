import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateOrderStatus, ORDER_STATUSES } from '@/lib/services/order-service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (body.status) {
      if (!ORDER_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'bad_status' }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.trackingNo !== undefined) patch.trackingNo = body.trackingNo || null;
    if (body.carrier !== undefined) patch.carrier = body.carrier || null;

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
    const order = await prisma.order.update({ where: { id }, data: patch });
    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    console.error('update order error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
