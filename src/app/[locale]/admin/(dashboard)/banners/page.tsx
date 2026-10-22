'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { bannerStatusLabel } from '@/lib/order-labels';
import { getDictionary } from '@/i18n/dictionaries';

type Banner = {
  id: string;
  image: string;
  title?: string | null;
  titleZh?: string | null;
  subtitle?: string | null;
  subtitleZh?: string | null;
  cta?: string | null;
  ctaZh?: string | null;
  href?: string | null;
  order: number;
  status: string;
};

const empty = (): Omit<Banner, 'id'> => ({
  image: '',
  title: '',
  titleZh: '',
  subtitle: '',
  subtitleZh: '',
  cta: '',
  ctaZh: '',
  href: '',
  order: 0,
  status: 'published',
});

export default function BannersAdmin() {
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
  const [list, setList] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<Omit<Banner, 'id'>>(empty());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/banners');
    if (res.ok) setList(await res.json());
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty());
    setErr('');
  };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      image: b.image,
      title: b.title ?? '',
      titleZh: b.titleZh ?? '',
      subtitle: b.subtitle ?? '',
      subtitleZh: b.subtitleZh ?? '',
      cta: b.cta ?? '',
      ctaZh: b.ctaZh ?? '',
      href: b.href ?? '',
      order: b.order,
      status: b.status,
    });
    setErr('');
  };

  const upload = async (f: File) => {
    const fd = new FormData();
    fd.append('file', f);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      setForm((p) => ({ ...p, image: d.url }));
    } else {
      setErr(t.uploadFailed);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image) {
      setErr(t.imageRequired);
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const res = editing
        ? await fetch(`/api/admin/banners/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/admin/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
      if (!res.ok) {
        setErr(t.saveFailed);
        return;
      }
      await load();
      openNew();
    } catch {
      setErr(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  };

  const label = 'text-xs tracking-widest text-muted block mb-1';
  const input =
    'w-full border border-line bg-surface px-3 py-2 outline-none focus:border-accent transition-colors text-sm';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">{t.banners}</h1>
        <button
          onClick={openNew}
          className="text-xs text-accent hover:underline"
        >
          + {t.newBanner}
        </button>
      </div>

      {/* list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((b) => (
          <div key={b.id} className="border border-line bg-surface p-3 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image}
              alt=""
              className="w-full h-32 object-cover bg-black/5"
            />
            <div className="text-sm text-ink truncate">
              {b.titleZh || b.title || '（无标题）'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>#{b.order}</span>
              <span>{bannerStatusLabel(b.status)}</span>
            </div>
            <div className="flex gap-3 text-xs">
              <button onClick={() => openEdit(b)} className="text-accent hover:underline">
                编辑
              </button>
              <button onClick={() => remove(b.id)} className="text-red-500 hover:underline">
                删除
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-muted col-span-full">{t.noBanners}</p>
        )}
      </div>

      {/* form */}
      <form
        onSubmit={submit}
        className="border border-line bg-surface p-5 space-y-4 max-w-2xl"
      >
        <h2 className="font-display text-xl text-ink">
          {editing ? t.editBanner : t.newBanner}
        </h2>

        <div>
          <label className={label}>{t.bannerImage} *</label>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {form.image && (
              <img src={form.image} alt="" className="w-24 h-16 object-cover bg-black/5" />
            )}
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await upload(f);
              }}
            />
          </div>
          <input
            className={input + ' mt-2'}
            value={form.image}
            onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
            placeholder="/uploads/xxx.svg or https://..."
          />
          <span className="text-[10px] text-muted">upload → /uploads</span>
          <p className="text-[10px] text-muted mt-1">
            建议尺寸 1920×1080（16:9 横图，首页全屏轮播用）；单张 ≤10MB
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>{t.title}（韩语/默认）</label>
            <input className={input} value={form.title ?? ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t.title} (中文)</label>
            <input className={input} value={form.titleZh ?? ''} onChange={(e) => setForm((p) => ({ ...p, titleZh: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t.subtitle}（韩语/默认）</label>
            <input className={input} value={form.subtitle ?? ''} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t.subtitle} (中文)</label>
            <input className={input} value={form.subtitleZh ?? ''} onChange={(e) => setForm((p) => ({ ...p, subtitleZh: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t.ctaText}（韩语/默认）</label>
            <input className={input} value={form.cta ?? ''} onChange={(e) => setForm((p) => ({ ...p, cta: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t.ctaText} (中文)</label>
            <input className={input} value={form.ctaZh ?? ''} onChange={(e) => setForm((p) => ({ ...p, ctaZh: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{t.ctaLink} (href)</label>
            <input className={input} value={form.href ?? ''} onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))} placeholder="/products" />
          </div>
          <div>
            <label className={label}>{t.order}</label>
            <input type="number" className={input} value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) || 0 }))} />
          </div>
        </div>

        <div>
          <label className={label}>{t.status}</label>
          <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="published">{t.published}</option>
            <option value="draft">{t.draft}</option>
          </select>
        </div>

        {err && <p className="text-xs text-red-500">{err}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? t.saving + '…' : t.save}
          </button>
          {editing && (
            <button type="button" onClick={openNew} className="text-xs text-muted hover:underline">
              {t.cancel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
