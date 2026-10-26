'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  productIds: string;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

type ProductOpt = { id: string; name: string; nameZh: string | null; code: string | null };

function parseIds(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function AdminCouponsPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [productKw, setProductKw] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: '',
    minSpend: '',
    productIds: [] as string[],
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
    fetch('/api/admin/products?limit=200')
      .then((r) => r.json())
      .then((d) => setProducts(d.items ?? d.products ?? []))
      .catch(() => {});
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ code: '', type: 'percent', value: '', minSpend: '', productIds: [], startsAt: '', expiresAt: '', usageLimit: '', active: true });
    (document.getElementById('coupon-modal') as HTMLElement)?.classList.remove('hidden');
  }
  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minSpend: String(c.minSpend),
      productIds: parseIds(c.productIds),
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
      productIds: form.productIds,
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
      setErr(t.saveFailed);
      return;
    }
    close();
    load();
  }

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
    load();
  }

  const input = 'w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-ink">{t.coupons}</h1>
        <button onClick={openNew} className="btn-gold">+ {t.add}</button>
      </div>

      {loading ? (
        <p className="text-muted">{t.cpLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-3 hover:bg-surface-2">
              <span className="font-medium text-ink w-28">{c.code}</span>
              <span className="text-sm w-20">
                {c.type === 'percent' ? c.value + '%' : formatPrice(c.value, locale)}
              </span>
              <span className="text-xs text-muted w-24">
                min {c.minSpend ? formatPrice(c.minSpend, locale) : '—'}
              </span>
              <span className="text-xs text-muted w-28">
                {parseIds(c.productIds).length > 0
                  ? t.cpLimitN.replace('{n}', String(parseIds(c.productIds).length))
                  : t.cpAllProducts}
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
                {t.edit}
              </button>
              <button onClick={() => remove(c.id)} className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600">
                {t.delete}
              </button>
            </div>
          ))}
          {coupons.length === 0 && <p className="p-5 text-sm text-muted">{t.noCoupons}</p>}
        </div>
      )}

      <div id="coupon-modal" className="hidden fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
        <form onSubmit={save} className="bg-bg w-full max-w-md my-8 border border-line p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl text-ink">{editing ? t.editCoupon : t.newCoupon}</h2>
            <button type="button" onClick={close} className="text-muted hover:text-ink">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.code2} *</label>
              <input className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.type}</label>
              <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percent">{t.percent} %</option>
                <option value="fixed">{t.fixed} ₩</option>
              </select>
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.value} *</label>
              <input type="number" className={input} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.minSpend}</label>
              <input type="number" className={input} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.start}</label>
              <input type="date" className={input} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.end}</label>
              <input type="date" className={input} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.usageLimit}</label>
            <input type="number" className={input} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs tracking-widest text-muted">{t.cpApplyProducts}</label>
              <span className="text-xs text-muted">
                {t.cpSelected.replace('{n}', String(form.productIds.length))}
                {form.productIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, productIds: [] }))}
                    className="ml-2 text-accent hover:underline"
                  >
                    {t.cpClear}
                  </button>
                )}
              </span>
            </div>
            <input
              className={input + ' mb-2'}
              value={productKw}
              onChange={(e) => setProductKw(e.target.value)}
              placeholder={t.cpSearchPh}
            />
            <div className="border border-line max-h-52 overflow-y-auto">
              {products
                .filter((p) => {
                  const k = productKw.trim().toLowerCase();
                  if (!k) return true;
                  return (
                    (p.name ?? '').toLowerCase().includes(k) ||
                    (p.nameZh ?? '').toLowerCase().includes(k) ||
                    (p.code ?? '').toLowerCase().includes(k)
                  );
                })
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(p.id)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          productIds: e.target.checked
                            ? [...f.productIds, p.id]
                            : f.productIds.filter((x) => x !== p.id),
                        }))
                      }
                    />
                    <span className="truncate">{p.nameZh || p.name}</span>
                    {p.code && <span className="text-xs text-muted shrink-0">{p.code}</span>}
                  </label>
                ))}
              {products.length === 0 && <p className="px-3 py-2 text-xs text-muted">{t.cpProductsLoading}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            {t.active}
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-gold">{t.save}</button>
            <button type="button" onClick={close} className="btn-outline">{t.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
