'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';
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
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
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
        <p className="text-xs text-muted mt-1">
          状态下拉可直接改订单状态；「已联系」是客服跟进标记，方便筛出还没处理的单。
        </p>
      </div>

      {/* 按客户筛选时的提示条 */}
      {userId && (
        <div className="mb-4 flex items-center gap-3 border border-accent/40 bg-accent/5 px-4 py-2 text-sm">
          <span>
            正在查看客户 <b>{userName || userId}</b> 的订单（{orders.length} 单）
          </span>
          <Link href={`/${'zh'}/admin/orders`} className="text-accent hover:underline text-xs">
            ✕ 清除筛选，查看全部
          </Link>
        </div>
      )}

      {/* 筛选查找 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索：订单号 / 客户邮箱 / 运单号"
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <select className={select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">全部状态</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, 'zh')}
            </option>
          ))}
        </select>
        <select
          className={select}
          value={fContacted}
          onChange={(e) => setFContacted(e.target.value)}
        >
          <option value="">已联系 / 未联系</option>
          <option value="yes">只看已联系</option>
          <option value="no">只看未联系</option>
        </select>
        <span className="text-xs text-muted self-center">
          {filtered.length} / {orders.length} 单
        </span>
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
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
                  title="点击查看订单详情"
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
                    title={`用 ${o.pointsUsed} 分抵扣 ${o.pointsDiscount}₩ · 赠送 ${o.pointsEarned} 分`}
                  >
                    {o.pointsUsed > 0 ? `积分 -${o.pointsUsed.toLocaleString()}` : ''}
                    {o.pointsUsed > 0 && o.pointsEarned > 0 ? ' / ' : ''}
                    {o.pointsEarned > 0 ? `返 +${o.pointsEarned.toLocaleString()}` : ''}
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
                  title={o.contacted ? '点击标记为未联系' : '点击标记为已联系'}
                >
                  {o.contacted ? '✓ 已联系' : '未联系'}
                </button>
                <select
                  value={o.status}
                  onChange={(e) => changeStatus(o.id, e.target.value)}
                  className="border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s, 'zh')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pl-48 flex-wrap">
                <input
                  className={input}
                  placeholder="运单号"
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
                  placeholder="快递公司"
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
                  {saving === o.id ? '保存中…' : '保存物流'}
                </button>
              </div>

              {/* 订单详情展开区 */}
              {expanded === o.id && (
                <div className="ml-48 border border-line bg-surface p-4 text-sm space-y-3">
                  <div>
                    <p className="text-xs tracking-widest text-muted mb-1">商品明细</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted text-left">
                          <th className="py-1 font-normal">商品</th>
                          <th className="py-1 font-normal">规格（尺码/颜色）</th>
                          <th className="py-1 font-normal">单价</th>
                          <th className="py-1 font-normal">数量</th>
                          <th className="py-1 font-normal">小计</th>
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
                      优惠券：
                      {o.couponCode ? (
                        <>
                          已使用 <span className="text-ink font-medium">{o.couponCode}</span>
                          {o.discount > 0 && `（-${formatPrice(o.discount, 'ko')}）`}
                        </>
                      ) : o.discount > 0 ? (
                        <>优惠 -{formatPrice(o.discount, 'ko')}（无券码）</>
                      ) : (
                        '未使用'
                      )}
                    </p>
                    <p>
                      积分抵扣：
                      {o.pointsUsed > 0 ? (
                        <>
                          使用{' '}
                          <span className="text-accent font-medium">
                            {o.pointsUsed.toLocaleString()} 分
                          </span>
                          ，抵现金{' '}
                          <span className="text-accent">
                            -{formatPrice(o.pointsDiscount, 'ko')}
                          </span>
                        </>
                      ) : (
                        '未使用'
                      )}
                    </p>
                    <p>
                      本单赠送积分：
                      {o.pointsEarned > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          {o.pointsEarned.toLocaleString()} 分
                        </span>
                      ) : (
                        '无'
                      )}
                    </p>
                    {(o.grantedCoupons?.length ?? 0) > 0 && (
                      <p>
                        本单赠送优惠券：
                        {o.grantedCoupons!.map((g, i) => (
                          <span key={`${g.code}-${i}`}>
                            {i > 0 && '、'}
                            <span className="text-ink font-medium">{g.code}</span>
                            {g.status === 'revoked' && (
                              <span className="text-muted">（已收回）</span>
                            )}
                            {g.status === 'used' && (
                              <span className="text-muted">（已使用）</span>
                            )}
                          </span>
                        ))}
                      </p>
                    )}
                    <p>
                      小计 {formatPrice(o.subtotal, 'ko')}
                      {o.discount > 0 && ` · 优惠 -${formatPrice(o.discount, 'ko')}`}
                      {o.pointsDiscount > 0 &&
                        ` · 积分抵扣 -${formatPrice(o.pointsDiscount, 'ko')}`}{' '}
                      · 运费{' '}
                      {o.shippingFee > 0 ? formatPrice(o.shippingFee, 'ko') : '免运费'} · 实付{' '}
                      <b className="text-ink">{formatPrice(o.total, 'ko')}</b>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-muted mb-1">收货地址</p>
                    {o.address ? (
                      <p className="text-xs">
                        {o.address.name} · {o.address.phone}
                        <br />
                        {o.address.country} {o.address.postalCode} · {o.address.state ?? ''}
                        {o.address.city} {o.address.line1} {o.address.line2 ?? ''}
                      </p>
                    ) : (
                      <p className="text-xs text-muted">（该订单没有保存地址快照）</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {orders.length === 0 ? '暂无订单。' : '没有符合筛选条件的订单。'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
