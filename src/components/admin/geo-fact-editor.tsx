'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import type { Locale } from '@/i18n/config';

type Fact = {
  id: string;
  kind: string;
  label: string;
  value: string;
  locale: string;
  order: number;
  status: string;
};

const EMPTY = { label: '', value: '', locale: '', kind: 'fact', order: 0, status: 'published' };

const KIND_KEYS = ['fact', 'claim', 'differentiator', 'audience', 'shipping', 'payment', 'contact'] as const;

export default function GeoFactEditor({ loc }: { loc: Locale }) {
  const { dict } = useLocale();
  const t = dict.admin;

  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Fact | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const input =
    'w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent';
  const label = 'text-xs tracking-widest text-muted block mb-1';
  const kindLabel = (k: string) =>
    k === 'claim'
      ? t.gkKindClaim
      : k === 'differentiator'
        ? t.gkKindDifferentiator
        : k === 'audience'
          ? t.gkKindAudience
          : k === 'shipping'
            ? t.gkKindShipping
            : k === 'payment'
              ? t.gkKindPayment
              : k === 'contact'
                ? t.gkKindContact
                : t.gkKindFact;

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/geofacts');
    const d = await res.json();
    setFacts(d.facts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setMsg('');
  }

  function openEdit(f: Fact) {
    setEditing(f);
    setForm({
      label: f.label,
      value: f.value,
      locale: f.locale,
      kind: f.kind,
      order: f.order,
      status: f.status,
    });
    setMsg('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !form.value.trim()) {
      setMsg(t.saveFailed);
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/geofacts', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
    });
    setMsg(res.ok ? '✓' : t.saveFailed);
    if (res.ok) {
      await load();
      openNew();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    await fetch(`/api/admin/geofacts?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl text-ink">{t.geoFactTitle}</h2>
      <p className="text-sm text-muted mt-1 max-w-3xl">{t.geoFactHint}</p>

      <form onSubmit={save} className="border border-line bg-surface p-6 mt-4 max-w-3xl space-y-4">
        <h3 className="font-semibold text-ink text-sm">
          {editing ? t.geoFactEdit : t.geoFactNew}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>{t.geoFactLabel} *</label>
            <input
              className={input}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder={t.gkShipTo}
            />
          </div>
          <div>
            <label className={label}>{t.geoFactKind}</label>
            <select
              className={input}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              {KIND_KEYS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{t.geoFactValue} *</label>
            <textarea
              className={`${input} min-h-[70px]`}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={t.gkShipFrom}
            />
          </div>
          <div>
            <label className={label}>{t.language}</label>
            <select
              className={input}
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
            >
              <option value="">{t.allLocales}</option>
              <option value="ko">{t.langNameKo}</option>
              <option value="zh">{t.langNameZh}</option>
              <option value="en">{t.langNameEn}</option>
            </select>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className={label}>{t.order}</label>
              <input
                type="number"
                className={input}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex-1">
              <label className={label}>{t.status}</label>
              <select
                className={input}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="published">{t.published}</option>
                <option value="draft">{t.draft}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? t.saving : t.save}
          </button>
          {editing && (
            <button type="button" onClick={openNew} className="btn-outline">
              {t.cancel}
            </button>
          )}
          {msg && <span className="text-xs text-accent">{msg}</span>}
        </div>
      </form>

      <div className="max-w-3xl mt-6">
        {loading ? (
          <p className="text-sm text-muted">{t.gkLoading}</p>
        ) : facts.length === 0 ? (
          <div className="border border-line bg-surface p-5">
            <p className="text-sm text-muted">{t.geoNoFacts}</p>
            <p className="text-xs text-muted mt-2 leading-relaxed">{t.gkAdvice}</p>
          </div>
        ) : (
          <div className="border border-line divide-y divide-line">
            {facts.map((f) => (
              <div key={f.id} className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink font-medium">{f.label}</p>
                    <p className="text-xs text-muted whitespace-pre-wrap mt-0.5">{f.value}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(f)}
                      className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent"
                    >
                      {t.edit}
                    </button>
                    <button
                      onClick={() => remove(f.id)}
                      className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted">
                    {kindLabel(f.kind)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted">
                    {f.locale ? f.locale.toUpperCase() : t.allLocales}
                  </span>
                  {f.status === 'draft' && (
                    <span className="text-[10px] px-1.5 py-0.5 border border-line text-muted">
                      {t.draft}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}