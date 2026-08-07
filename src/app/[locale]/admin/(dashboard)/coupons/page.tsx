'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: '',
    minSpend: '',
    startsAt: '',
    expiresAt: '',
    usageLimit: '',
    active: true,
  });
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/coupons');
    setCoupons((await r.json()).coupons ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ code: '', type: 'percent', value: '', minSpend: '', startsAt: '', expiresAt: '', usageLimit: '', active: true });
    (document.getElementById('coupon-modal') as HTMLElement)?.classList.remove('hidden');
  }
  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minSpend: String(c.minSpend),
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      active: c.active,
    });
    (document.getElementById('coupon-modal') as HTMLElement)?.classList.remove('hidden');
  }
  function close() {
    (document.getElementById('coupon-modal') as HTMLElement)?.classList.add('hidden');
    setErr('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const payload = {
      ...form,
      value: Number(form.value),
      minSpend: Number(form.minSpend) || 0,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    };
    const res = editing
      ? await fetch('/api/admin/coupons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
      : await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      setErr('Save failed');
      return;
    }
    close();
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete coupon?')) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
    load();
  }

  const input = 'w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-ink">Coupons</h1>
        <button onClick={openNew} className="btn-gold">+ New</button>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-3 hover:bg-surface-2">
              <span className="font-medium text-ink w-28">{c.code}</span>
              <span className="text-sm w-20">
                {c.type === 'percent' ? c.value + '%' : formatPrice(c.value, 'ko')}
              </span>
              <span className="text-xs text-muted w-24">
                min {c.minSpend ? formatPrice(c.minSpend, 'ko') : '—'}
              </span>
              <span className="text-xs text-muted w-20">
                {c.usedCount}/{c.usageLimit ?? '∞'}
              </span>
              <span
                className={`text-xs px-2 py-1 border border-line w-16 text-center ${c.active ? 'text-accent' : 'text-muted'}`}
              >
                {c.active ? 'ON' : 'OFF'}
              </span>
              <button onClick={() => openEdit(c)} className="text-xs px-3 py-1.5 border border-line hover:border-ink">
                Edit
              </button>
              <button onClick={() => remove(c.id)} className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600">
                Del
              </button>
            </div>
          ))}
          {coupons.length === 0 && <p className="p-5 text-sm text-muted">No coupons</p>}
        </div>
      )}

      <div id="coupon-modal" className="hidden fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
        <form onSubmit={save} className="bg-bg w-full max-w-md my-8 border border-line p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl text-ink">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
            <button type="button" onClick={close} className="text-muted hover:text-ink">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Code *</label>
              <input className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Type</label>
              <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed ₩</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Value *</label>
              <input type="number" className={input} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Min spend</label>
              <input type="number" className={input} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Start</label>
              <input type="date" className={input} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">Expire</label>
              <input type="date" className={input} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">Usage limit (blank = ∞)</label>
            <input type="number" className={input} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-gold">Save</button>
            <button type="button" onClick={close} className="btn-outline">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
