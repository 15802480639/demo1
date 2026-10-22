import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { getOrdersByUser, ORDER_STATUSES } from '@/lib/services/order-service';
import { formatPrice } from '@/lib/format';
import { statusLabel } from '@/lib/order-labels';

/** 状态徽章配色：进行中=金、完成=绿、异常=红 */
const STATUS_CLS: Record<string, string> = {
  pending: 'border-amber-300 text-amber-700 bg-amber-50',
  paid: 'border-emerald-300 text-emerald-700 bg-emerald-50',
  fulfilled: 'border-blue-300 text-blue-700 bg-blue-50',
  shipped: 'border-blue-400 text-blue-800 bg-blue-50',
  completed: 'border-line text-muted bg-surface-2',
  cancelled: 'border-red-300 text-red-600 bg-red-50',
  refunded: 'border-red-300 text-red-600 bg-red-50',
};

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();
  if (!session) redirect(`/${loc}/login?redirect=/${loc}/account/orders`);

  const all = await getOrdersByUser(session.id);
  const active = ORDER_STATUSES.includes(sp.status as any)
    ? all.filter((o) => o.status === sp.status)
    : all;
  const countOf = (s: string) => all.filter((o) => o.status === s).length;
  const dateFmt = new Intl.DateTimeFormat(loc === 'zh' ? 'zh-CN' : loc === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const tabs = [
    { key: '', label: dict.account.all, count: all.length },
    ...ORDER_STATUSES.map((s) => ({
      key: s,
      label: statusLabel(s, loc),
      count: countOf(s),
    })),
  ];

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-ink mb-8">{dict.account.myOrders}</h1>

      {/* 状态筛选 tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => {
          const href = t.key
            ? `/${loc}/account/orders?status=${t.key}`
            : `/${loc}/account/orders`;
          const on = t.key ? sp.status === t.key : !sp.status;
          if (t.key && t.count === 0 && !on) return null; // 没单的状态不占位
          return (
            <Link
              key={t.key}
              href={href}
              className={`text-xs tracking-wide px-3 py-2 border transition-colors ${
                on
                  ? 'border-ink bg-ink text-white'
                  : 'border-line text-ink-soft hover:border-accent hover:text-accent'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-70">({t.count})</span>
            </Link>
          );
        })}
      </div>

      {active.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted mb-6">{dict.account.emptyOrders}</p>
          <Link href={`/${loc}/products`} className="btn-gold">
            {dict.account.goShopping}
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {active.map((o) => {
            const firstImg = o.items.find((it) => it.imageUrl)?.imageUrl;
            const more = o.items.reduce((s, it) => s + it.quantity, 0);
            return (
              <Link
                key={o.id}
                href={`/${loc}/order/${o.orderNo}`}
                className="block border border-line p-5 hover:border-accent transition-colors"
              >
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">{o.orderNo}</span>
                    <span className="text-xs text-muted">
                      {dict.account.orderDate} {dateFmt.format(new Date(o.createdAt))}
                    </span>
                  </div>
                  <span
                    className={`text-xs border px-2.5 py-1 ${
                      STATUS_CLS[o.status] ?? 'border-line'
                    }`}
                  >
                    {statusLabel(o.status, loc)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {firstImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={firstImg}
                      alt=""
                      className="w-14 h-14 object-cover border border-line shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 border border-line bg-surface-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">
                      {o.items[0]?.name}
                      {o.items.length > 1 &&
                        ` ${dict.account.moreItems.replace('{n}', String(o.items.length - 1))}`}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {dict.account.qty} {more}
                      {o.trackingNo && (
                        <>
                          {' · '}
                          {dict.account.trackingNo}: {o.trackingNo}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="font-display text-xl shrink-0">
                    {formatPrice(o.total, loc)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
