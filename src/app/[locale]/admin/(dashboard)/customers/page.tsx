'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { getDictionary } from '@/i18n/dictionaries';
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
  const { locale } = useLocale();
  const t = getDictionary('zh').admin;
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
      setCouponMsg('请选择要发放的优惠券');
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
      setCouponMsg(`✓ 已发放 ${c?.code ?? ''}，用户可在「我的优惠券」查看`);
    } else {
      setCouponMsg('发放失败，请重试');
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
      setPmMsg('请输入非 0 的整数（正数增加、负数扣减）');
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
      setPmMsg(`✓ 成功，当前积分 ${d.balance.toLocaleString()}`);
      setAmount('');
      setRemark('');
      // 就地更新列表
      setList((ls) => ls.map((x) => (x.id === editing.id ? { ...x, points: d.balance } : x)));
      setTimeout(() => setEditing(null), 900);
    } else {
      setPmMsg(d.error === 'bad_amount' ? '请输入有效的整数' : '操作失败，请重试');
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">客户管理</h1>
        <p className="text-xs text-muted mt-1">
          搜索客户邮箱或昵称，点「订单管理」查看该客户名下的订单列表和订单详情。点积分数字可手动增减积分。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索：邮箱 / 昵称"
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <span className="text-xs text-muted self-center">
          {filtered.length} / {list.length} 位客户
        </span>
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
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
                  {c.email || '未留邮箱'} · 注册于{' '}
                  {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <span className="text-sm w-20 text-center text-muted">
                {c.orderCount} 单
              </span>
              <button
                onClick={() => openPointEditor(c)}
                className="text-sm w-24 text-right hover:text-accent"
                title="点击手动增减积分"
              >
                <span className="text-accent">{c.points.toLocaleString()}</span>
                <span className="text-[10px] text-muted ml-1">分</span>
              </button>
              <span className="font-display text-lg w-32 text-right">
                {formatPrice(c.spent, 'ko')}
              </span>
              <button
                onClick={() => openCouponEditor(c)}
                className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent whitespace-nowrap"
                title="给该客户发放优惠券"
              >
                {t.grantCoupon}
              </button>
              <Link
                href={`/${locale}/admin/orders?userId=${c.id}`}
                className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent whitespace-nowrap"
              >
                订单管理 →
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {list.length === 0 ? '暂无客户。' : '没有符合搜索条件的客户。'}
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
              客户：<span className="text-ink">{editing.name || editing.email || editing.id}</span>
              <br />
              当前积分：<span className="text-accent">{editing.points.toLocaleString()}</span>
            </p>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">
                变动数量（正数增加，负数扣减）
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="如 1000 或 -500"
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">备注原因</label>
              <input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="如：售后补偿 / 活动赠送"
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
                {saving ? '处理中…' : '确认'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-outline"
              >
                取消
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
              客户：<span className="text-ink">{couponTarget.name || couponTarget.email || couponTarget.id}</span>
              <br />
              <span className="text-xs">发放后用户可在「我的账户 → 我的优惠券」看到，结算时输入券码即可使用。</span>
            </p>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">选择优惠券</label>
              <select
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— 请选择 —</option>
                {couponList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}（{c.type === 'percent' ? `${c.value}%` : `₩${c.value}`}
                    {c.active ? '' : ' · 已停用'}）
                  </option>
                ))}
              </select>
              {couponList.length === 0 && (
                <p className="text-[11px] text-muted mt-1">
                  还没有优惠券，请先到「优惠券管理」创建。
                </p>
              )}
            </div>
            {couponMsg && (
              <p className={`text-xs ${couponMsg.startsWith('✓') ? 'text-accent' : 'text-red-600'}`}>
                {couponMsg}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={submitCoupon} className="btn-gold">
                确认发放
              </button>
              <button
                type="button"
                onClick={() => setCouponTarget(null)}
                className="btn-outline"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
