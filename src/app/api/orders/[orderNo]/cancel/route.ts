import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cancelOrderByUser } from '@/lib/services/order-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const { orderNo } = await params;
  try {
    const order = await cancelOrderByUser(orderNo, session.id);
    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    const msg = e?.message;
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (msg === 'NOT_CANCELLABLE') {
      return NextResponse.json({ error: 'NOT_CANCELLABLE' }, { status: 409 });
    }
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
