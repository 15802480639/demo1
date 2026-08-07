import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAdminOrders } from '@/lib/services/order-service';

export async function GET() {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const orders = await getAdminOrders(100);
  return NextResponse.json({ orders });
}
