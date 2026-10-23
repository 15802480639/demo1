import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getSession } from '@/lib/auth';
import { getOrderByNo } from '@/lib/services/order-service';
import { formatPrice } from '@/lib/format';
import { statusLabel } from '@/lib/order-labels';
import { OrderActions } from '@/components/order/order-actions';

/** 正常流转的时间线节点（cancelled / refunded 不走时间线，显示红条） */
const TIMELINE = ['pending', 'paid', 'fulfilled', 'shipped', 'completed'] as const;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderNo: string }>;
}) {
  const { locale, orderNo } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const t = dict.account;
  const session = await getSession();
  if (!session) redirect(`/${loc}/login?redirect=/${loc}/order/${orderNo}`);

  const order = await getOrderByNo(orderNo, session.role === 'admin' ? undefined : session.id);
  if (!order) notFound();

  const dateFmt = new Intl.DateTimeFormat(
    loc === 'zh' ? 'zh-CN' : loc === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  );
  const stepIdx = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]);
  const isAbnormal = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-12">
      <Link href={`/${loc}/account/orders`} className="text-sm text-muted hover:text-accent">
        ← {t.myOrders}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 mb-2">
        <h1 className="font-display text-4xl text-ink">{order.orderNo}</h1>
        <span
          className={`text-xs border px-3 py-1.5 ${
            isAbnormal
              ? 'border-red-300 text-red-600 bg-red-50'
              : 'border-line'
          }`}
        >
          {statusLabel(order.status, loc)}
        </span>
      </div>
      <p className="text-xs text-muted mb-8">
        {t.orderDate} {dateFmt.format(new Date(order.createdAt))}
      </p>

      {/* 状态时间线 */}
      {!isAbnormal && stepIdx >= 0 && (
        <div className="border border-line p-6 mb-6">
          <p className="text-xs tracking-widest text-muted mb-5">{t.orderTimeline}</p>
          <div className="flex items-center">
            {TIMELINE.map((s, i) => {
              const done = i <= stepIdx;
              return (
                <div key={s} className={`flex items-center ${i < TIMELINE.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center shrink-0">
                    <span
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs ${
                        done
                          ? 'bg-accent border-accent text-white'
                          : 'border-line text-muted bg-surface'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span
                      className={`mt-1.5 text-[10px] whitespace-nowrap ${
                        done ? 'text-ink' : 'text-muted'
                      }`}
                    >
                      {statusLabel(s, loc)}
                    </span>
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <span
                      className={`flex-1 h-px mx-1 mb-5 ${
                        i < stepIdx ? 'bg-accent' : 'bg-line'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 物流信息 */}
      {order.trackingNo ? (
        <div className="border border-line bg-surface p-5 mb-6">
          <p className="text-xs tracking-widest text-muted mb-2">{t.shippingInfo}</p>
          <p className="text-ink text-sm">
            {order.carrier || t.carrierPlaceholder} ·{' '}
            <span className="font-medium">{order.trackingNo}</span>
          </p>
        </div>
      ) : null}

      <OrderActions orderNo={order.orderNo} status={order.status} />

      {/* 商品清单 */}
      <div className="border border-line mt-6">
        {order.items.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0"
          >
            {it.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.imageUrl}
                alt=""
                className="w-14 h-14 object-cover border border-line shrink-0"
              />
            ) : (
              <div className="w-14 h-14 border border-line bg-surface-2 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate">{it.name}</p>
              {/* 规格快照：下单当时选的尺码/颜色，历史订单永久保留 */}
              {it.skuLabel && (
                <p className="text-xs text-ink-soft mt-0.5">{it.skuLabel}</p>
              )}
              <p className="text-xs text-muted mt-0.5">
                {formatPrice(it.price, loc)} × {it.quantity}
              </p>
            </div>
            <span className="font-display text-lg shrink-0">
              {formatPrice(it.price * it.quantity, loc)}
            </span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div>
          <h2 className="text-xs tracking-widest text-muted mb-3">{t.shipTo}</h2>
          <div className="text-sm space-y-1 text-ink-soft">
            <p>{order.user?.name ?? order.user?.email}</p>
            <p>
              {order.address?.line1} {order.address?.line2}
            </p>
            <p>
              {order.address?.city} {order.address?.state} {order.address?.postalCode}
            </p>
            <p>{order.address?.country}</p>
            <p>{order.address?.phone}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t.subtotal}</span>
            <span>{formatPrice(order.subtotal, loc)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">{dict.common.sale}</span>
              <span className="text-accent">−{formatPrice(order.discount, loc)}</span>
            </div>
          )}
          {order.pointsDiscount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">
                {loc === 'zh'
                  ? `积分抵扣（${order.pointsUsed.toLocaleString()} 分）`
                  : loc === 'en'
                    ? `Points used (${order.pointsUsed.toLocaleString()})`
                    : `포인트 사용 (${order.pointsUsed.toLocaleString()}P)`}
              </span>
              <span className="text-accent">−{formatPrice(order.pointsDiscount, loc)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">{t.shippingFeeLabel}</span>
            <span>{formatPrice(order.shippingFee, loc)}</span>
          </div>
          <div className="luxe-rule my-2" />
          <div className="flex justify-between font-medium">
            <span>{t.total}</span>
            <span className="font-display text-2xl">
              {formatPrice(order.total, loc)}
            </span>
          </div>
          {order.pointsEarned > 0 && (
            <p className="text-xs text-accent text-right mt-1">
              {loc === 'zh'
                ? `本单获得 ${order.pointsEarned.toLocaleString()} 积分`
                : loc === 'en'
                  ? `Earned ${order.pointsEarned.toLocaleString()} points`
                  : `${order.pointsEarned.toLocaleString()}P 적립`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
