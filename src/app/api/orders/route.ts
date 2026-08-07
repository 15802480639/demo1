import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createOrder } from '@/lib/services/order-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = body.items;
    const shipping = body.shipping;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'no_items' }, { status: 400 });
    }
    const valid = items.every(
      (it: any) => it && typeof it.slug === 'string' && Number(it.qty) > 0,
    );
    if (!valid) {
      return NextResponse.json({ error: 'bad_items' }, { status: 400 });
    }
    if (!shipping || !shipping.email || !shipping.name || !shipping.line1) {
      return NextResponse.json({ error: 'bad_shipping' }, { status: 400 });
    }

    const session = await getSession();
    const order = await createOrder({
      items,
      shipping,
      session,
      couponCode: body.couponCode || undefined,
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        total: order.total,
        shippingFee: order.shippingFee,
        subtotal: order.subtotal,
        discount: order.discount,
        couponCode: order.couponCode,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
      },
    });
  } catch (e: any) {
    console.error('order create error', e);
    if (e?.message === 'NO_ITEMS') {
      return NextResponse.json({ error: 'no_items' }, { status: 400 });
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
