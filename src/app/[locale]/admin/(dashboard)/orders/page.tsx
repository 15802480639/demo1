'use client';

import { useEffect, useState } from 'react';
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

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  trackingNo: string | null;
  carrier: string | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
  items: { name: string; quantity: number }[];
};

export default function AdminOrdersPage() {
  const { locale } = useLocale();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/orders');
    const data = await res.json();
    setOrders(
      (data.orders ?? []).map((o: any) => ({
        ...o,
        trackingNo: o.trackingNo ?? null,
        carrier: o.carrier ?? null,
        createdAt: new Date(o.createdAt).toISOString(),
      })),
    );
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: string, status: string) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
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

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-6">Orders</h1>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {orders.map((o) => (
            <div key={o.id} className="p-4 space-y-3 hover:bg-surface-2">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-40 shrink-0">
                  <p className="text-sm text-ink">{o.orderNo}</p>
                  <p className="text-xs text-muted">
                    {o.user?.email ?? '—'} ·{' '}
                    {new Date(o.createdAt).toLocaleDateString(
                      locale === 'ko' ? 'ko-KR' : locale,
                    )}
                  </p>
                </div>
                <div className="flex-1 min-w-0 text-sm text-ink-soft truncate">
                  {o.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')}
                </div>
                <span className="font-display text-lg w-28 text-right">
                  {formatPrice(o.total, locale)}
                </span>
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
              <div className="flex items-center gap-2 pl-44 flex-wrap">
                <input
                  className={input}
                  placeholder="운송장번호"
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
                  placeholder="택배사"
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
                  {saving === o.id ? '…' : '추적저장'}
                </button>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="p-5 text-sm text-muted">No orders</p>}
        </div>
      )}
    </div>
  );
}
