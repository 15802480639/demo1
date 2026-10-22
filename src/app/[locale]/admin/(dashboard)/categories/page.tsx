'use client';

import { useEffect, useState } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-provider';

type Category = {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  sortOrder: number;
  _count?: { products: number };
};

export default function AdminCategoriesPage() {
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('new');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/categories');
    const data = await res.json();
    setList(data.categories ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      alert(d?.message ?? '删除失败（分类可能正在被使用）');
      return;
    }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-ink">{t.categories}</h1>
          <p className="text-xs text-muted mt-1">
            分类是商品管理的上层结构：先建分类，商品再挂到分类下。名称支持韩语 + 中文双语。
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormKey('new-' + Date.now());
            setShowForm(true);
          }}
          className="btn-gold"
        >
          + 新建分类
        </button>
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <div className="flex-1 min-w-0">
                <p className="text-ink">
                  {c.name}
                  {c.nameZh && <span className="text-muted"> / {c.nameZh}</span>}
                </p>
                <p className="text-xs text-muted">
                  /{c.slug} · 排序 {c.sortOrder} · {c._count?.products ?? 0} 个商品
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing(c);
                  setFormKey(c.id);
                  setShowForm(true);
                }}
                className="text-xs px-3 py-1.5 border border-line hover:border-ink"
              >
                编辑
              </button>
              <button
                onClick={() => remove(c.id)}
                className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
              >
                删除
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <p className="p-5 text-sm text-muted">暂无分类，点右上角「新建分类」创建。</p>
          )}
        </div>
      )}

      {showForm && (
        <CategoryForm
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

function CategoryForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = getDictionary('zh').admin;
  const [name, setName] = useState(editing?.name ?? '');
  const [nameZh, setNameZh] = useState(editing?.nameZh ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [sortOrder, setSortOrder] = useState(editing ? String(editing.sortOrder) : '0');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) {
      setErr('请填写分类名称（韩语）');
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/categories/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, nameZh, sortOrder: Number(sortOrder) || 0 }),
          })
        : await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, nameZh, slug, sortOrder: Number(sortOrder) || 0 }),
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
            {editing ? '编辑分类' : '新建分类'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>名称（韩语）*</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>名称（中文）</label>
            <input className={input} value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </div>
          {!editing && (
            <div>
              <label className={label}>URL slug（留空自动生成）</label>
              <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          )}
          <div>
            <label className={label}>排序（小的在前）</label>
            <input
              type="number"
              className={input}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? '保存中…' : t.save}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
