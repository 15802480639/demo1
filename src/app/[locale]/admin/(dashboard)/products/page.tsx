'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';
import { statusLabel } from '@/lib/order-labels';

type Sku = {
  id?: string;
  skuCode: string;
  options: string | null;
  stock: number;
  price: number | null;
};
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  price: number;
  compareAtPrice: number | null;
  status: string;
  description: string | null;
  tags: string;
  images: string;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  skus: Sku[];
};
type Option = { id: string; name: string };

function firstImage(images: string): string | null {
  try {
    return JSON.parse(images)[0] ?? null;
  } catch {
    return null;
  }
}
function parseOpts(s: string | null) {
  try {
    const o = JSON.parse(s ?? '{}');
    return { size: o.Size ?? '', color: o.Color ?? '' };
  } catch {
    return { size: '', color: '' };
  }
}

export default function AdminProductsPage() {
  const { locale } = useLocale();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('new');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/products');
    const data = await res.json();
    setProducts(data.products ?? []);
    setBrands(data.brands ?? []);
    setCategories(data.categories ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    load();
  }

  function openNew() {
    setEditing(null);
    setFormKey('new-' + Date.now());
    setShowForm(true);
  }
  function openEdit(p: ProductRow) {
    setEditing(p);
    setFormKey(p.id);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-ink">Products</h1>
        <button onClick={openNew} className="btn-gold">
          + New
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {products.map((p) => {
            const img = firstImage(p.images);
            return (
              <div key={p.id} className="flex items-center gap-4 p-3 hover:bg-surface-2">
                <div className="w-12 h-14 bg-surface-2 rounded overflow-hidden shrink-0">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ink truncate">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.code || '—'} · {p.brand?.name ?? '—'} · {p.category?.name ?? '—'}
                  </p>
                </div>
                <span className="text-sm w-28 text-right">
                  {formatPrice(p.price, locale)}
                </span>
                <span
                  className={`text-xs px-2 py-1 border border-line w-20 text-center ${
                    p.status === 'active' ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {statusLabel(p.status, locale)}
                </span>
                <button
                  onClick={() => openEdit(p)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-ink"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                >
                  Del
                </button>
              </div>
            );
          })}
          {products.length === 0 && <p className="p-5 text-sm text-muted">No products</p>}
        </div>
      )}

      {showForm && (
        <ProductForm
          key={formKey}
          editing={editing}
          brands={brands}
          categories={categories}
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

function ProductForm({
  editing,
  brands,
  categories,
  onClose,
  onSaved,
}: {
  editing: ProductRow | null;
  brands: Option[];
  categories: Option[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [code, setCode] = useState(editing?.code ?? '');
  const [gender, setGender] = useState('');
  const [brandId, setBrandId] = useState(editing?.brand?.id ?? '');
  const [categoryId, setCategoryId] = useState(editing?.category?.id ?? '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [compareAtPrice, setCompareAtPrice] = useState(
    editing?.compareAtPrice ? String(editing.compareAtPrice) : '',
  );
  const [status, setStatus] = useState(editing?.status ?? 'draft');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [tags, setTags] = useState(
    (() => {
      try {
        return (JSON.parse(editing?.tags ?? '[]') as string[]).join(', ');
      } catch {
        return '';
      }
    })(),
  );
  const [images, setImages] = useState(
    (() => {
      try {
        return (JSON.parse(editing?.images ?? '[]') as string[]).join('\n');
      } catch {
        return '';
      }
    })(),
  );
  const [skus, setSkus] = useState<
    { id?: string; size: string; color: string; stock: number; price: string }[]
  >(
    editing
      ? editing.skus.map((s) => {
          const o = parseOpts(s.options);
          return {
            id: s.id,
            size: o.size,
            color: o.color,
            stock: s.stock,
            price: s.price == null ? '' : String(s.price),
          };
        })
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function addSku() {
    setSkus((s) => [...s, { size: '', color: '', stock: 0, price: '' }]);
  }
  function updateSku(i: number, k: 'size' | 'color' | 'stock' | 'price', v: string) {
    setSkus((s) =>
      s.map((sk, idx) =>
        idx === i
          ? { ...sk, [k]: k === 'stock' || k === 'price' ? (v === '' ? '' : Number(v)) : v }
          : sk,
      ),
    );
  }
  function removeSku(i: number) {
    setSkus((s) => s.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name || !categoryId || !(Number(price) > 0)) {
      setErr('Name, category and price are required');
      return;
    }
    setSaving(true);
    const payload = {
      name,
      code: code || undefined,
      gender: gender || undefined,
      brandId: brandId || undefined,
      categoryId,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      status,
      description: description || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      images: images
        .split(/[\n,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      skus: skus.map((s) => ({
        id: s.id,
        size: s.size || undefined,
        color: s.color || undefined,
        stock: Number(s.stock) || 0,
        price: s.price === '' ? undefined : Number(s.price),
      })),
    };
    try {
      const res = editing
        ? await fetch(`/api/admin/products/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        setErr('Save failed');
        return;
      }
      onSaved();
    } catch {
      setErr('Save failed');
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
        className="bg-bg w-full max-w-2xl my-8 border border-line p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-2xl text-ink">
            {editing ? 'Edit Product' : 'New Product'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Name *</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Code</label>
            <input className={input} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className={label}>Gender</label>
            <select className={input} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">—</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label className={label}>Brand</label>
            <select className={input} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Category *</label>
            <select
              className={input}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Price (₩) *</label>
            <input
              type="number"
              className={input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>Compare-at price</label>
            <input
              type="number"
              className={input}
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea
            className={input}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className={label}>Tags (comma separated)</label>
          <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <label className={label}>Images (URL per line)</label>
          <textarea
            className={input}
            rows={2}
            value={images}
            onChange={(e) => setImages(e.target.value)}
            placeholder="https://... or /uploads/xxx.svg"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              id="img-upload"
              className="text-xs"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.append('file', f);
                const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                if (res.ok) {
                  const d = await res.json();
                  setImages((prev) => (prev ? `${prev}\n${d.url}` : d.url));
                } else {
                  setErr('Upload failed');
                }
              }}
            />
            <span className="text-[10px] text-muted">upload → /uploads</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className={label + ' mb-0'}>SKUs / Inventory</label>
            <button type="button" onClick={addSku} className="text-xs text-accent hover:underline">
              + Add size/color
            </button>
          </div>
          <div className="space-y-2">
            {skus.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className={input}
                  placeholder="Size"
                  value={s.size}
                  onChange={(e) => updateSku(i, 'size', e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Color"
                  value={s.color}
                  onChange={(e) => updateSku(i, 'color', e.target.value)}
                />
                <input
                  type="number"
                  className={input}
                  placeholder="Stock"
                  value={s.stock}
                  onChange={(e) => updateSku(i, 'stock', e.target.value)}
                />
                <input
                  type="number"
                  className={input}
                  placeholder="Price"
                  value={s.price}
                  onChange={(e) => updateSku(i, 'price', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSku(i)}
                  className="text-red-600 text-xs px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            {skus.length === 0 && (
              <p className="text-xs text-muted">
                No SKUs — one default SKU will be created on save.
              </p>
            )}
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? '…' : 'Save'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
