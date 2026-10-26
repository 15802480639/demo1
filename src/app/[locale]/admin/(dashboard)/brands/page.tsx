'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Brand = {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  _count?: { products: number };
};

export default function AdminBrandsPage() {
  const { dict } = useLocale();
  const t = dict.admin;
  const [list, setList] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('new');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/brands');
    const data = await res.json();
    setList(data.brands ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      alert(d?.message ?? t.brErrDelete);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-ink">{t.brands}</h1>
          <p className="text-xs text-muted mt-1">{t.brIntro}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormKey('new-' + Date.now());
            setShowForm(true);
          }}
          className="btn-gold"
        >
          + {t.brNewTitle}
        </button>
      </div>

      {loading ? (
        <p className="text-muted">{t.cLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {list.map((b) => (
            <div key={b.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink">
                  {b.name}
                  {b.nameZh && <span className="text-muted"> / {b.nameZh}</span>}
                </p>
                <p className="text-xs text-muted">
                  {t.brMeta
                    .replace('{slug}', b.slug)
                    .replace('{n}', String(b._count?.products ?? 0))}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing(b);
                  setFormKey(b.id);
                  setShowForm(true);
                }}
                className="text-xs px-3 py-1.5 border border-line hover:border-ink"
              >
                {t.edit}
              </button>
              <button
                onClick={() => remove(b.id)}
                className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
              >
                {t.delete}
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <p className="p-5 text-sm text-muted">{t.brEmpty}</p>
          )}
        </div>
      )}

      {showForm && (
        <BrandForm
          key={formKey}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function BrandForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.admin;
  const [name, setName] = useState(editing?.name ?? '');
  const [nameZh, setNameZh] = useState(editing?.nameZh ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) {
      setErr(t.brErrName);
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/brands/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, nameZh }),
          })
        : await fetch('/api/admin/brands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, nameZh, slug }),
          });
      if (!res.ok) {
        setErr(t.saveFailed);
        return;
      }
      onSaved();
    } catch {
      setErr(t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const label = 'text-xs tracking-widest text-muted block mb-1';
  const input =
    'w-full border border-line bg-surface px-3 py-2 outline-none focus:border-accent transition-colors text-sm';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <form
        onSubmit={submit}
        className="bg-bg w-full max-w-xl my-8 border border-line p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-2xl text-ink">
            {editing ? t.brEditTitle : t.brNewTitle}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>{t.brNameKo}</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>{t.brNameZh}</label>
            <input className={input} value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </div>
          {!editing && (
            <div>
              <label className={label}>{t.brSlug}</label>
              <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          )}
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? t.saving : t.save}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
