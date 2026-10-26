'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';

type Customer = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  createdAt: string;
  points: number;
  orderCount: number;
  spent: number;
};

export default function AdminCustomersPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  // 积分调整弹窗
  const [editing, setEditing] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [pmMsg, setPmMsg] = useState('');

  // 发券弹窗
  const [couponTarget, setCouponTarget] = useState<Customer | null>(null);
  const [couponList, setCouponList] = useState<
    { id: string; code: string; type: string; value: number; active: boolean }[]
  >([]);
  const [couponId, setCouponId] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/coupons')
      .then((r) => r.json())
      .then((d) => setCouponList(d.coupons ?? []))
      .catch(() => {});
  }, []);

  function openCouponEditor(c: Customer) {
    setCouponTarget(c);
    setCouponId('');
    setCouponMsg('');
  }

  async function submitCoupon() {
    if (!couponTarget) return;
    if (!couponId) {
      setCouponMsg(t.cPickCoupon);
      return;
    }
    const res = await fetch(`/api/admin/customers/${couponTarget.id}/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponId }),
    });
    const d = await res.json();
    if (res.ok) {
      const c = couponList.find((x) => x.id === couponId);
      setCouponMsg(t.cGranted.replace('{code}', c?.code ?? ''));
    } else {
      setCouponMsg(t.cGrantFailed);
    }
  }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/customers');
    const data = await res.json();
    setList(data.customers ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (c) =>
        (c.email ?? '').toLowerCase().includes(kw) ||
        (c.username ?? '').toLowerCase().includes(kw) ||
        (c.name ?? '').toLowerCase().includes(kw),
    );
  }, [list, q]);

  function openPointEditor(c: Customer) {
    setEditing(c);
    setAmount('');
    setRemark('');
    setPmMsg('');
  }

  async function submitPoints() {
    if (!editing) return;
    const n = Math.trunc(Number(amount));
    if (!Number.isFinite(n) || n === 0) {
      setPmMsg(t.cPmBadAmount);
      return;
    }
    setSaving(true);
    setPmMsg('');
    const res = await fetch(`/api/admin/customers/${editing.id}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: n, remark }),
    });
    const d = await res.json();
    if (res.ok) {
      setPmMsg(t.cPmOk.replace('{n}', d.balance.toLocaleString()));
      setAmount('');
      setRemark('');
      // 就地更新列表
      setList((ls) => ls.map((x) => (x.id === editing.id ? { ...x, points: d.balance } : x)));
      setTimeout(() => setEditing(null), 900);
    } else {
      setPmMsg(d.error === 'bad_amount' ? t.cPmInvalid : t.cPmFailed);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.customers}</h1>
        <p className="text-xs text-muted mt-1">{t.cIntro}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.cSearchPh}
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <span className="text-xs text-muted self-center">
          {filtered.length} / {list.length} {t.cUnit}
        </span>
      </div>

      {loading ? (
        <p className="text-muted">{t.cLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink truncate">
                  {c.name || c.username || c.email || '—'}
                </p>
                <p className="text-xs text-muted">
                  {c.username ? `@${c.username}` : ''}
                  {c.username && c.email ? ' · ' : ''}
                  {c.email || t.cNoEmail} ·{' '}
                  {t.cJoinedAt.replace('{d}', new Date(c.createdAt).toLocaleDateString('zh-CN'))}
                </p>
              </div>
              <span className="text-sm w-20 text-center text-muted">
                {c.orderCount} {t.cOrderUnit}
              </span>
              <div className="flex items-center justify-end gap-2 w-40">
                <button
                  onClick={() => openPointEditor(c)}
                  className="text-sm hover:opacity-70 flex items-baseline gap-1"
                  title={t.cPointsTip}
                >
                  <span className="text-accent font-display text-base">
                    {c.points.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted">{t.cPointsUnit}</span>
                </button>
                <button
                  onClick={() => openPointEditor(c)}
                  className="text-xs px-2 py-1 border border-line hover:border-accent text-accent whitespace-nowrap"
                  title={t.cAdjustTip}
                >
                  {t.cAdjustBtn}
                </button>
              </div>
              <span className="font-display text-lg w-32 text-right">
                {formatPrice(c.spent, 'ko')}
              </span>
              <button
                onClick={() => openCouponEditor(c)}
                className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent whitespace-nowrap"
                title={t.cGrantTip}
              >
                {t.grantCoupon}
              </button>
              <Link
                href={`/${locale}/admin/orders?userId=${c.id}`}
                className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent whitespace-nowrap"
              >
                {t.cOrdersLink}
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {list.length === 0 ? t.cEmpty : t.cNoMatch}
            </p>
          )}
        </div>
      )}

      {/* 积分调整弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-bg w-full max-w-md border border-line p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl text-ink">{t.adjustPoints}</h3>
              <button
                onClick={() => setEditing(null)}
                className="text-muted hover:text-ink"
                type="button"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted">
              {t.cPmCustomerLabel}
              <span className="text-ink">{editing.name || editing.email || editing.id}</span>
              <br />
              {t.cPmCurrent}
              <span className="text-accent">{editing.points.toLocaleString()}</span>
            </p>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">
                {t.cPmAmountLabel}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t.cPmAmountPh}
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.cPmReasonLabel}</label>
              <input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={t.cPmReasonPh}
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            {pmMsg && (
              <p className={`text-xs ${pmMsg.startsWith('✓') ? 'text-accent' : 'text-red-600'}`}>
                {pmMsg}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={submitPoints} disabled={saving} className="btn-gold">
                {saving ? t.cProcessing : t.cConfirm}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-outline"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发券弹窗 */}
      {couponTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-bg w-full max-w-md border border-line p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl text-ink">{t.grantCoupon}</h3>
              <button
                onClick={() => setCouponTarget(null)}
                className="text-muted hover:text-ink"
                type="button"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted">
              {t.cPmCustomerLabel}
              <span className="text-ink">{couponTarget.name || couponTarget.email || couponTarget.id}</span>
              <br />
              <span className="text-xs">{t.cGrantHint}</span>
            </p>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.cGrantPickLabel}</label>
              <select
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">{t.cPickPh}</option>
                {couponList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}（{c.type === 'percent' ? `${c.value}%` : `₩${c.value}`}
                    {c.active ? '' : t.cDisabled}）
                  </option>
                ))}
              </select>
              {couponList.length === 0 && (
                <p className="text-[11px] text-muted mt-1">{t.cNoCouponsYet}</p>
              )}
            </div>
            {couponMsg && (
              <p className={`text-xs ${couponMsg.startsWith('✓') ? 'text-accent' : 'text-red-600'}`}>
                {couponMsg}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={submitCoupon} className="btn-gold">
                {t.cGrantSubmit}
              </button>
              <button
                type="button"
                onClick={() => setCouponTarget(null)}
                className="btn-outline"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
