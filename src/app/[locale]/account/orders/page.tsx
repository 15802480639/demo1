import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { getOrdersByUser } from '@/lib/services/order-service';
import { formatPrice } from '@/lib/format';
import { statusLabel } from '@/lib/order-labels';

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();
  if (!session) redirect(`/${loc}/login?redirect=/${loc}/account/orders`);

  const orders = await getOrdersByUser(session.id);

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-ink mb-8">
        {dict.nav.account === '마이페이지' ? '주문 내역' : 'My Orders'}
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted mb-6">—</p>
          <Link href={`/${loc}/products`} className="btn-gold">
            {dict.nav.shop}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/${loc}/order/${o.orderNo}`}
              className="block border border-line p-5 hover:border-accent transition-colors"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted">{o.orderNo}</span>
                <span className="text-xs border border-line px-2 py-1">
                  {statusLabel(o.status, loc)}
                </span>
              </div>
              {o.items.map((it) => (
                <div
                  key={it.id}
                  className="flex justify-between py-1 text-sm"
                >
                  <span className="text-ink-soft truncate pr-2">
                    {it.name} × {it.quantity}
                  </span>
                  <span>{formatPrice(it.price * it.quantity, loc)}</span>
                </div>
              ))}
              <div className="luxe-rule my-3" />
              <div className="flex justify-between font-medium">
                <span>{dict.common.price}</span>
                <span className="font-display text-xl">
                  {formatPrice(o.total, loc)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
