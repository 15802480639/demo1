'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-provider';

type Category = {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  parentId: string | null;
  sortOrder: number;
  _count?: { products: number };
};

/** 前端根据 parentId 组树（后台只需要最多 3 级，直接在前端排） */
type TreeNode = Category & { children: TreeNode[] };

function buildRows(list: Category[]) {
  const byId = new Map<string, TreeNode>();
  for (const c of list) byId.set(c.id, { ...c, children: [] });
  const roots: TreeNode[] = [];
  for (const c of list) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: Category, b: Category) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  const rows: { node: Category; depth: number }[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of [...nodes].sort(sortFn)) {
      rows.push({ node: n, depth });
      walk(n.children, depth + 1);
    }
  };
  walk(roots, 1);
  return rows;
}

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

  const rows = useMemo(() => buildRows(list), [list]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-ink">{t.categories}</h1>
          <p className="text-xs text-muted mt-1">
            分类是商品管理的上层结构，支持最多 3 级（一级 → 二级 → 三级）。
            名称支持韩语 + 中文双语。
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
          {rows.map(({ node: c, depth }) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 hover:bg-surface-2"
              style={{ paddingLeft: `${16 + (depth - 1) * 28}px` }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-ink">
                  {depth > 1 && (
                    <span className="text-muted mr-1.5 select-none">
                      {depth === 2 ? '└' : '　└'}
                    </span>
                  )}
                  {c.name}
                  {c.nameZh && <span className="text-muted"> / {c.nameZh}</span>}
                  <span className="ml-2 text-[10px] text-accent border border-accent/40 px-1.5 py-0.5 align-middle">
                    {depth} 级
                  </span>
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
          {rows.length === 0 && (
            <p className="p-5 text-sm text-muted">暂无分类，点右上角「新建分类」创建。</p>
          )}
        </div>
      )}

      {showForm && (
        <CategoryForm
          key={formKey}
          editing={editing}
          all={list}
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
  all,
  onClose,
  onSaved,
}: {
  editing: Category | null;
  all: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = getDictionary('zh').admin;
  const [name, setName] = useState(editing?.name ?? '');
  const [nameZh, setNameZh] = useState(editing?.nameZh ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [sortOrder, setSortOrder] = useState(editing ? String(editing.sortOrder) : '0');
  const [parentId, setParentId] = useState(editing?.parentId ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  /**
   * 可选上级列表：
   * - 一级分类：可作为 2 级或 3 级的父
   * - 二级分类：只能作为 3 级的父
   * - 排除自己和自己的所有后代（避免选到会成环的项）
   */
  const parentOptions = useMemo(() => {
    const byId = new Map(all.map((c) => [c.id, c]));
    const descendants = new Set<string>();
    const collect = (id: string) => {
      for (const c of all) {
        if (c.parentId === id && !descendants.has(c.id)) {
          descendants.add(c.id);
          collect(c.id);
        }
      }
    };
    if (editing) {
      descendants.add(editing.id);
      collect(editing.id);
    }

    const depthOf = (id: string): number => {
      let d = 1;
      let cur: string | null = id;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        const p = byId.get(cur)?.parentId ?? null;
        if (!p) break;
        d += 1;
        cur = p;
      }
      return d;
    };

    return all
      .filter((c) => !descendants.has(c.id))
      // 父分类自身层级 + 1（子级）+ 已有子树高度 <= 3
      .filter((c) => {
        const childHeight = (id: string): number => {
          const kids = all.filter((x) => x.parentId === id);
          if (!kids.length) return 0;
          return Math.max(...kids.map((k) => 1 + childHeight(k.id)));
        };
        return depthOf(c.id) + 1 + childHeight(editing?.id ?? '') <= 3;
      })
      .sort((a, b) => depthOf(a.id) - depthOf(b.id) || a.sortOrder - b.sortOrder)
      .map((c) => ({
        id: c.id,
        label: `${'　'.repeat(depthOf(c.id) - 1)}${c.name}${c.nameZh ? ` / ${c.nameZh}` : ''}`,
        depth: depthOf(c.id),
      }));
  }, [all, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) {
      setErr('请填写分类名称（韩语）');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        nameZh,
        sortOrder: Number(sortOrder) || 0,
        parentId: parentId || '',
      };
      const res = editing
        ? await fetch(`/api/admin/categories/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, slug }),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setErr(d?.message ?? t.saveFailed);
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
          <div className="col-span-2">
            <label className={label}>上级分类（留空 = 一级分类）</label>
            <select className={input} value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— 无（一级分类）—</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted mt-1.5">
              最多 3 级：一级分类可直接建子级，二级分类下可再建一级子级。
            </p>
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
