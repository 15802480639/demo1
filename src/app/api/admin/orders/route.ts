import { NextRequest, NextResponse } from 'next/server';
import { HttpError, getSession, requirePermission } from '@/lib/auth';
import { getAdminOrders } from '@/lib/services/order-service';
import { apiFail } from '@/lib/api-fail';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('orders.view');
    const userId = req.nextUrl.searchParams.get('userId') ?? undefined;
    const orders = await getAdminOrders(200, userId || undefined);
    return NextResponse.json({ orders });
  } catch (e) {
    return apiFail(e);
  }
}
