'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';
import { statusLabel } from '@/lib/order-labels';

const STATUSES = [
  'pending',
  'paid',
  'fulfilled',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
];

type AddressRow = {
  name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
} | null;

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  trackingNo: string | null;
  carrier: string | null;
  contacted: boolean;
  createdAt: string;
  pointsUsed: number;
  pointsDiscount: number;
  pointsEarned: number;
  /** 本单赠送的优惠券（商品赠券功能） */
  grantedCoupons?: { code: string; status: string }[];
  user: { id: string; email: string; name: string | null } | null;
  address: AddressRow;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    skuLabel: string | null;
    options: string | null;
    skuCode?: string | null;
  }[];
};

export default function AdminOrdersPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const sp = useSearchParams();
  const userId = sp.get('userId') ?? '';

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // 筛选
  const [fStatus, setFStatus] = useState('');
  const [fContacted, setFContacted] = useState('');
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/orders${userId ? `?userId=${userId}` : ''}`);
    const data = await res.json();
    setOrders(
      (data.orders ?? []).map((o: any) => ({
        ...o,
        trackingNo: o.trackingNo ?? null,
        carrier: o.carrier ?? null,
        contacted: !!o.contacted,
        createdAt: new Date(o.createdAt).toISOString(),
      })),
    );
    const u = (data.orders ?? [])[0]?.user;
    setUserName(u ? u.name || u.email : '');
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [userId]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (fStatus && o.status !== fStatus) return false;
      if (fContacted === 'yes' && !o.contacted) return false;
      if (fContacted === 'no' && o.contacted) return false;
      if (kw) {
        const hay = `${o.orderNo} ${o.user?.email ?? ''} ${o.trackingNo ?? ''}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [orders, fStatus, fContacted, q]);

  async function changeStatus(id: string, status: string) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async function toggleContacted(o: OrderRow) {
    const next = !o.contacted;
    setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, contacted: next } : x)));
    await fetch(`/api/admin/orders/${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacted: next }),
    });
  }

  async function saveTracking(o: OrderRow) {
    setSaving(o.id);
    await fetch(`/api/admin/orders/${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNo: o.trackingNo, carrier: o.carrier }),
    });
    setSaving(null);
  }

  const input =
    'border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent w-36';
  const select =
    'border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.orders}</h1>
        <p className="text-xs text-muted mt-1">{t.oIntro}</p>
      </div>

      {/* 按客户筛选时的提示条 */}
      {userId && (
        <div className="mb-4 flex items-center gap-3 border border-accent/40 bg-accent/5 px-4 py-2 text-sm">
          <span>
            {t.oFilteringUser
              .replace('{name}', String(userName || userId))
              .replace('{n}', String(orders.length))}
          </span>
          <Link href={`/${locale}/admin/orders`} className="text-accent hover:underline text-xs">
            {t.oClearFilter}
          </Link>
        </div>
      )}

      {/* 筛选查找 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.oSearchPh}
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <select className={select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">{t.oAllStatus}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, locale)}
            </option>
          ))}
        </select>
        <select
          className={select}
          value={fContacted}
          onChange={(e) => setFContacted(e.target.value)}
        >
          <option value="">{t.oContactedAny}</option>
          <option value="yes">{t.oContactedYes}</option>
          <option value="no">{t.oContactedNo}</option>
        </select>
        <span className="text-xs text-muted self-center">
          {filtered.length} / {orders.length} {t.oUnit}
        </span>
      </div>

      {loading ? (
        <p className="text-muted">{t.oLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((o) => (
            <div key={o.id} className="p-4 space-y-3 hover:bg-surface-2">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-44 shrink-0">
                  <p className="text-sm text-ink">{o.orderNo}</p>
                  <p className="text-xs text-muted">
                    {o.user?.email ?? '—'} ·{' '}
                    {new Date(o.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="flex-1 min-w-0 text-sm text-ink-soft truncate text-left hover:text-accent"
                  title={t.oViewDetail}
                >
                  {expanded === o.id ? '▾ ' : '▸ '}
                  {o.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}
                </button>
                <span className="font-display text-lg w-28 text-right">
                  {formatPrice(o.total, 'ko')}
                </span>
                {/* 积分标记 */}
                {(o.pointsUsed > 0 || o.pointsEarned > 0) && (
                  <span
                    className="text-[10px] px-2 py-1 border border-accent/40 text-accent whitespace-nowrap"
                    title={t.oPointsTip
                      .replace('{a}', String(o.pointsUsed))
                      .replace('{b}', String(o.pointsDiscount))
                      .replace('{c}', String(o.pointsEarned))}
                  >
                    {o.pointsUsed > 0 ? t.oPointsUsedBadge.replace('{n}', o.pointsUsed.toLocaleString()) : ''}
                    {o.pointsUsed > 0 && o.pointsEarned > 0 ? ' / ' : ''}
                    {o.pointsEarned > 0 ? t.oPointsEarnedBadge.replace('{n}', o.pointsEarned.toLocaleString()) : ''}
                  </span>
                )}
                {/* 已联系标记 */}
                <button
                  onClick={() => toggleContacted(o)}
                  className={`text-xs px-2.5 py-1.5 border whitespace-nowrap ${
                    o.contacted
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                      : 'border-line text-muted hover:border-accent'
                  }`}
                  title={o.contacted ? t.oMarkContacted : t.oMarkUncontacted}
                >
                  {o.contacted ? t.oContactedBadge : t.oUncontactedBadge}
                </button>
                <select
                  value={o.status}
                  onChange={(e) => changeStatus(o.id, e.target.value)}
                  className="border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pl-48 flex-wrap">
                <input
                  className={input}
                  placeholder={t.oTrackingPh}
                  value={o.trackingNo ?? ''}
                  onChange={(e) =>
                    setOrders((os) =>
                      os.map((x) =>
                        x.id === o.id ? { ...x, trackingNo: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  className={input}
                  placeholder={t.oCarrierPh}
                  value={o.carrier ?? ''}
                  onChange={(e) =>
                    setOrders((os) =>
                      os.map((x) =>
                        x.id === o.id ? { ...x, carrier: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  onClick={() => saveTracking(o)}
                  disabled={saving === o.id}
                  className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent"
                >
                  {saving === o.id ? t.oSaving : t.oSaveLogistics}
                </button>
              </div>

              {/* 订单详情展开区 */}
              {expanded === o.id && (
                <div className="ml-48 border border-line bg-surface p-4 text-sm space-y-3">
                  <div>
                    <p className="text-xs tracking-widest text-muted mb-1">{t.oItemsTitle}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted text-left">
                          <th className="py-1 font-normal">{t.oColProduct}</th>
                          <th className="py-1 font-normal">{t.oColSpec}</th>
                          <th className="py-1 font-normal">{t.oColPrice}</th>
                          <th className="py-1 font-normal">{t.oColQty}</th>
                          <th className="py-1 font-normal">{t.oColSubtotal}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.items.map((it) => (
                          <tr key={it.id} className="border-t border-line">
                            <td className="py-1.5 pr-2">{it.name}</td>
                            <td className="py-1.5 pr-2 text-ink-soft">
                              {it.skuLabel || <span className="text-muted">—</span>}
                            </td>
                            <td className="py-1.5">{formatPrice(it.price, 'ko')}</td>
                            <td className="py-1.5">×{it.quantity}</td>
                            <td className="py-1.5">
                              {formatPrice(it.price * it.quantity, 'ko')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-muted space-y-0.5">
                    <p>
                      {t.oCouponLabel}
                      {o.couponCode ? (
                        <>
                          {t.oCouponUsed}{' '}
                          <span className="text-ink font-medium">{o.couponCode}</span>
                          {o.discount > 0 && `（-${formatPrice(o.discount, 'ko')}）`}
                        </>
                      ) : o.discount > 0 ? (
                        <>{t.oCouponNoneCode.replace('{n}', formatPrice(o.discount, 'ko'))}</>
                      ) : (
                        t.oCouponUnused
                      )}
                    </p>
                    <p>
                      {t.oPointsLabel}
                      {o.pointsUsed > 0 ? (
                        <>
                          {t.pointsUsed}{' '}
                          <span className="text-accent font-medium">
                            {o.pointsUsed.toLocaleString()}
                          </span>{' '}
                          {t.oPointsWorth}{' '}
                          <span className="text-accent">
                            -{formatPrice(o.pointsDiscount, 'ko')}
                          </span>
                        </>
                      ) : (
                        t.oCouponUnused
                      )}
                    </p>
                    <p>
                      {t.oEarnedLabel}
                      {o.pointsEarned > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          {o.pointsEarned.toLocaleString()} {t.cPointsUnit}
                        </span>
                      ) : (
                        t.oPointsNone
                      )}
                    </p>
                    {(o.grantedCoupons?.length ?? 0) > 0 && (
                      <p>
                        {t.oGrantCouponLabel}
                        {o.grantedCoupons!.map((g, i) => (
                          <span key={`${g.code}-${i}`}>
                            {i > 0 && '、'}
                            <span className="text-ink font-medium">{g.code}</span>
                            {g.status === 'revoked' && (
                              <span className="text-muted">{t.oCouponRevoked}</span>
                            )}
                            {g.status === 'used' && (
                              <span className="text-muted">{t.oCouponUsedTag}</span>
                            )}
                          </span>
                        ))}
                      </p>
                    )}
                    <p>
                      {t.oSubtotalText.replace('{n}', formatPrice(o.subtotal, 'ko'))}
                      {o.discount > 0 && t.oDiscountText.replace('{n}', formatPrice(o.discount, 'ko'))}
                      {o.pointsDiscount > 0 &&
                        t.oPointsDeductText.replace('{n}', formatPrice(o.pointsDiscount, 'ko'))}{' '}
                      {o.shippingFee > 0
                        ? t.oShippingText.replace('{n}', formatPrice(o.shippingFee, 'ko'))
                        : ` · ${t.oFreeShipping}`}{' '}
                      {t.oPaidText.replace('{n}', formatPrice(o.total, 'ko'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-muted mb-1">{t.oAddressTitle}</p>
                    {o.address ? (
                      <p className="text-xs">
                        {o.address.name} · {o.address.phone}
                        <br />
                        {o.address.country} {o.address.postalCode} · {o.address.state ?? ''}
                        {o.address.city} {o.address.line1} {o.address.line2 ?? ''}
                      </p>
                    ) : (
                      <p className="text-xs text-muted">{t.oNoAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {orders.length === 0 ? t.oEmpty : t.oNoMatch}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
