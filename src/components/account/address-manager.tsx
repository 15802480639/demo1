'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Addr = {
  id: string;
  name: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  country: string;
  postalCode: string;
  phone: string | null;
  isDefault: boolean;
};

export function AddressManager() {
  const { dict } = useLocale();
  const t = dict.account;
  const EMPTY = {
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: dict.checkout.countryDefault,
    postalCode: '',
    phone: '',
    isDefault: false,
  };
  const [list, setList] = useState<Addr[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Addr | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/account/addresses');
    setList((await r.json()).addresses ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    (document.getElementById('addr-modal') as HTMLElement)?.classList.remove('hidden');
  }
  function openEdit(a: Addr) {
    setEditing(a);
    setForm({
      name: a.name ?? '',
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state ?? '',
      country: a.country,
      postalCode: a.postalCode,
      phone: a.phone ?? '',
      isDefault: a.isDefault,
    });
    (document.getElementById('addr-modal') as HTMLElement)?.classList.remove('hidden');
  }
  function close() {
    (document.getElementById('addr-modal') as HTMLElement)?.classList.add('hidden');
    setErr('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!form.line1 || !form.city || !form.postalCode) {
      setErr(t.requiredMissing);
      return;
    }
    const body = { ...form };
    const res = editing
      ? await fetch(`/api/account/addresses/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/account/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
    await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    load();
  }
  async function setDefault(id: string) {
    await fetch(`/api/account/addresses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    load();
  }

  const input = 'w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <section className="border border-line p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-ink">{t.myAddresses}</h2>
        <button onClick={openNew} className="btn-gold text-sm px-4 py-2">
          + {t.addAddress}
        </button>
      </div>
      {loading ? (
        <p className="text-muted text-sm">…</p>
      ) : list.length === 0 ? (
        <p className="text-muted text-sm">{t.noAddresses}</p>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="border border-line p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-ink font-medium">
                    {a.name || a.line1}{' '}
                    {a.isDefault && (
                      <span className="text-[10px] tracking-widest text-accent border border-accent px-1.5 py-0.5 ml-1">
                        {t.defaultTag}
                      </span>
                    )}
                  </p>
                  <p className="text-ink-soft mt-1">
                    {a.line1} {a.line2}
                  </p>
                  <p className="text-ink-soft">
                    {a.city} {a.state ? `/ ${a.state}` : ''} {a.postalCode}
                  </p>
                  <p className="text-muted">{a.country}{a.phone ? ` · ${a.phone}` : ''}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => openEdit(a)} className="text-xs px-3 py-1.5 border border-line hover:border-ink">
                    {t.edit}
                  </button>
                  {!a.isDefault && (
                    <button onClick={() => setDefault(a.id)} className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent">
                      {t.setDefault}
                    </button>
                  )}
                  <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600">
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div id="addr-modal" className="hidden fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
        <form onSubmit={save} className="bg-bg w-full max-w-md my-8 border border-line p-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-2xl text-ink">
              {editing ? t.editAddress : t.newAddress}
            </h3>
            <button type="button" onClick={close} className="text-muted hover:text-ink">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.recipient}</label>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.phone}</label>
              <input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.addressLabel} *</label>
            <input className={input} value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.address2Label}</label>
            <input className={input} value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.city} *</label>
              <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.state}</label>
              <input className={input} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted block mb-1">{t.postal} *</label>
              <input className={input} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-widest text-muted block mb-1">{t.country}</label>
            <input className={input} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            {t.setDefaultCheck}
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-gold">{t.save}</button>
            <button type="button" onClick={close} className="btn-outline">{t.cancel}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
