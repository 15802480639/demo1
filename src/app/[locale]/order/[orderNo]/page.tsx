import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { getOrderByNo } from '@/lib/services/order-service';
import { formatPrice } from '@/lib/format';
import { statusLabel } from '@/lib/order-labels';
import { OrderActions } from '@/components/order/order-actions';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderNo: string }>;
}) {
  const { locale, orderNo } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();
  if (!session) redirect(`/${loc}/login?redirect=/${loc}/order/${orderNo}`);

  const order = await getOrderByNo(orderNo, session.role === 'admin' ? undefined : session.id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <Link href={`/${loc}/account/orders`} className="text-sm text-muted hover:text-accent">
        ← {dict.nav.account === '마이페이지' ? '주문 내역' : 'My Orders'}
      </Link>
      <div className="flex items-center justify-between mt-4 mb-8">
        <h1 className="font-display text-4xl text-ink">{order.orderNo}</h1>
        <span className="text-xs border border-line px-3 py-1.5">
          {statusLabel(order.status, loc)}
        </span>
      </div>

      {order.trackingNo ? (
        <div className="border border-line bg-surface p-4 mb-6 text-sm">
          <p className="text-xs tracking-widest text-muted mb-2">
            {loc === 'ko' ? '배송 조회' : 'Shipping'}
          </p>
          <p className="text-ink">
            {order.carrier || (loc === 'ko' ? '택배사' : 'Carrier')} ·{' '}
            <span className="font-medium">{order.trackingNo}</span>
          </p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(order.trackingNo!)}
            className="text-xs text-accent mt-1 underline"
          >
            {loc === 'ko' ? '운송장번호 복사' : 'Copy tracking no.'}
          </button>
        </div>
      ) : null}

      <OrderActions orderNo={order.orderNo} status={order.status} />

      <div className="border border-line">
        {order.items.map((it) => (
          <div
            key={it.id}
            className="flex justify-between items-center px-5 py-4 border-b border-line last:border-0"
          >
            <div>
              <p className="text-ink">{it.name}</p>
              <p className="text-xs text-muted">
                {formatPrice(it.price, loc)} × {it.quantity}
              </p>
            </div>
            <span className="font-display text-lg">
              {formatPrice(it.price * it.quantity, loc)}
            </span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div>
          <h2 className="text-xs tracking-widest text-muted mb-3">
            {dict.common.options}
          </h2>
          <div className="text-sm space-y-1 text-ink-soft">
            <p>{order.user?.name ?? order.user?.email}</p>
            <p>{order.address?.line1} {order.address?.line2}</p>
            <p>
              {order.address?.city} {order.address?.state} {order.address?.postalCode}
            </p>
            <p>{order.address?.country}</p>
            <p>{order.address?.phone}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{dict.common.price}</span>
            <span>{formatPrice(order.subtotal, loc)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{dict.common.freeShipping}</span>
            <span>{formatPrice(order.shippingFee, loc)}</span>
          </div>
          <div className="luxe-rule my-2" />
          <div className="flex justify-between font-medium">
            <span>{dict.common.price}</span>
            <span className="font-display text-2xl">
              {formatPrice(order.total, loc)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
