'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { formatPrice } from '@/lib/format';
import { productStatusLabel } from '@/lib/order-labels';

type Sku = {
  id?: string;
  skuCode: string;
  options: string | null;
  stock: number;
  price: number | null;
};
type SpecRow = {
  id: string;
  name: string;
  nameZh: string | null;
  values: string; // JSON: [{"ko":"레드","zh":"红色"}]
  order: number;
};
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  code: string | null;
  price: number;
  compareAtPrice: number | null;
  status: string;
  description: string | null;
  descriptionZh: string | null;
  tags: string;
  images: string;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  skus: Sku[];
  specs?: SpecRow[];
  // 积分配置
  earnPoints: boolean;
  earnType: string;
  earnValue: number;
  usePoints: boolean;
  maxPointUse: number;
  // 购买赠送的优惠券 ID（JSON 数组字符串）
  grantCouponIds: string;
};
type Option = { id: string; name: string };
type CouponOption = { id: string; code: string; type: string; value: number };

/** 把商品上配的赠券 ID 解析成券码（用于列表展示） */
function grantedCouponCodes(grantCouponIds: string, coupons: CouponOption[]): string[] {
  try {
    const ids = JSON.parse(grantCouponIds || '[]');
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => coupons.find((c) => c.id === id)?.code)
      .filter((x): x is string => !!x);
  } catch {
    return [];
  }
}

function firstImage(images: string): string | null {
  try {
    return JSON.parse(images)[0] ?? null;
  } catch {
    return null;
  }
}
function parseOpts(s: string | null): Record<string, string> {
  try {
    const o = JSON.parse(s ?? '{}');
    return o && typeof o === 'object' ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}
function parseSpecValues(v: string): { ko: string; zh?: string }[] {
  try {
    const arr = JSON.parse(v ?? '[]');
    if (!Array.isArray(arr)) return [];
    return arr.map((x: unknown) =>
      typeof x === 'string' ? { ko: x } : (x as { ko: string; zh?: string }),
    );
  } catch {
    return [];
  }
}
/** 旧商品没有规格组时，从已有 SKU 的 options 反推规格组，保证老数据也能用多规格界面 */
function specsFromSkus(skus: Sku[]): { name: string; nameZh?: string; values: { ko: string; zh?: string }[] }[] {
  const map = new Map<string, Set<string>>();
  for (const sk of skus) {
    const o = parseOpts(sk.options);
    for (const [k, v] of Object.entries(o)) {
      if (!k || !v || k === 'Option') continue;
      if (!map.has(k)) map.set(k, new Set());
      map.get(k)!.add(v);
    }
  }
  return Array.from(map.entries()).map(([k, set]) => ({
    name: k,
    values: Array.from(set).map((v) => ({ ko: v })),
  }));
}

export default function AdminProductsPage() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('new');
  // 筛选查找 + 分页
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  async function load() {
    setLoading(true);
    const [res, cRes] = await Promise.all([
      fetch('/api/admin/products'),
      fetch('/api/admin/coupons'),
    ]);
    const data = await res.json();
    const cData = cRes.ok ? await cRes.json().catch(() => ({})) : {};
    setProducts(data.products ?? []);
    setBrands(data.brands ?? []);
    setCategories(data.categories ?? []);
    setCoupons(cData.coupons ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return products.filter((p) => {
      if (fCat && p.category?.id !== fCat) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (kw) {
        const hay = `${p.name} ${p.nameZh ?? ''} ${p.code ?? ''} ${p.slug}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [products, q, fCat, fStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  // 筛选条件变化时回到第一页
  useEffect(() => {
    setPage(1);
  }, [q, fCat, fStatus]);

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
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

  const select =
    'border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{t.products}</h1>
          <p className="text-xs text-muted mt-1">{t.pIntro}</p>
        </div>
        <button onClick={openNew} className="btn-gold">
          + {t.newProduct}
        </button>
      </div>

      {/* 筛选查找 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.pSearchPh}
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <select className={select} value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">{t.pAllCats}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">{t.pAllStatus}</option>
          <option value="active">{t.active}</option>
          <option value="draft">{t.draft}</option>
          <option value="archived">{t.archived}</option>
        </select>
        <span className="text-xs text-muted self-center">
          {filtered.length} / {products.length} {t.pUnit}
        </span>
      </div>

      {loading ? (
        <p className="text-muted">{t.pLoading}</p>
      ) : (
        <div className="border border-line divide-y divide-line">
          {pageItems.map((p) => {
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
                  <p className="text-ink truncate">
                    {p.name}
                    {p.nameZh && <span className="text-muted"> / {p.nameZh}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {p.code || '—'} · {p.brand?.name ?? '—'} · {p.category?.name ?? '—'} ·{' '}
                    {p.skus.length} {t.pSkuUnit}
                    {grantedCouponCodes(p.grantCouponIds, coupons).length > 0 &&
                      ` · ${t.pGrantLabel} ${grantedCouponCodes(p.grantCouponIds, coupons).join('、')}`}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {t.pEarnLabel}
                    {p.earnPoints
                      ? p.earnType === 'fixed'
                        ? t.pEarnFixed.replace('{n}', String(p.earnValue))
                        : p.earnValue > 0
                          ? t.pEarnPercent.replace('{n}', String(p.earnValue))
                          : t.pEarnGlobal
                      : t.pNoEarn}
                    {' · '}
                    {p.usePoints ? t.pUseYes : t.pUseNo}
                  </p>
                </div>
                <span className="text-sm w-28 text-right">
                  {formatPrice(p.price, 'ko')}
                </span>
                <span
                  className={`text-xs px-2 py-1 border border-line w-16 text-center ${
                    p.status === 'active' ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {productStatusLabel(p.status, locale)}
                </span>
                <button
                  onClick={() => openEdit(p)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-ink"
                >
                  {t.edit}
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                >
                  {t.delete}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {products.length === 0 ? t.pEmpty : t.pNoMatch}
            </p>
          )}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 border border-line hover:border-ink disabled:opacity-40"
          >
            {t.pPrev}
          </button>
          <span className="text-muted text-xs">
            {t.pPageInfo
              .replace('{a}', String(safePage))
              .replace('{b}', String(totalPages))
              .replace('{n}', String(filtered.length))}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 border border-line hover:border-ink disabled:opacity-40"
          >
            {t.pNext}
          </button>
        </div>
      )}

      {showForm && (
        <ProductForm
          key={formKey}
          editing={editing}
          brands={brands}
          categories={categories}
          coupons={coupons}
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
  coupons,
  onClose,
  onSaved,
}: {
  editing: ProductRow | null;
  brands: Option[];
  categories: Option[];
  coupons: CouponOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.admin;
  const [name, setName] = useState(editing?.name ?? '');
  const [nameZh, setNameZh] = useState(editing?.nameZh ?? '');
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
  const [descriptionZh, setDescriptionZh] = useState(editing?.descriptionZh ?? '');
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
  const [uploading, setUploading] = useState(false);
  type SkuRow = { id?: string; options: Record<string, string>; stock: number; price: string };
  const [skus, setSkus] = useState<SkuRow[]>(
    editing
      ? editing.skus.map((s) => ({
          id: s.id,
          options: parseOpts(s.options),
          stock: s.stock,
          price: s.price == null ? '' : String(s.price),
        }))
      : [],
  );
  const [specs, setSpecs] = useState<
    { name: string; nameZh?: string; values: { ko: string; zh?: string }[] }[]
  >(() => {
    if (editing?.specs?.length) {
      return editing.specs.map((sp) => ({
        name: sp.name,
        nameZh: sp.nameZh ?? undefined,
        values: parseSpecValues(sp.values),
      }));
    }
    return editing ? specsFromSkus(editing.skus) : [];
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // ---- 积分配置 ----
  const [earnPoints, setEarnPoints] = useState(editing?.earnPoints ?? true);
  const [earnType, setEarnType] = useState(editing?.earnType ?? 'percent');
  const [earnValue, setEarnValue] = useState(
    editing?.earnValue ? String(editing.earnValue) : '',
  );
  const [usePoints, setUsePoints] = useState(editing?.usePoints ?? true);
  const [maxPointUse, setMaxPointUse] = useState(
    editing?.maxPointUse ? String(editing.maxPointUse) : '',
  );

  // ---- 购买赠送优惠券 ----
  const [grantCouponIds, setGrantCouponIds] = useState<string[]>(() => {
    try {
      const arr = JSON.parse(editing?.grantCouponIds ?? '[]');
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  function addSku() {
    setSkus((s) => [...s, { options: {}, stock: 0, price: '' }]);
  }
  function updateSkuOpt(i: number, key: string, v: string) {
    setSkus((s) =>
      s.map((sk, idx) => (idx === i ? { ...sk, options: { ...sk.options, [key]: v } } : sk)),
    );
  }
  function updateSkuNum(i: number, k: 'stock' | 'price', v: string) {
    setSkus((s) =>
      s.map((sk, idx) =>
        idx === i ? { ...sk, [k]: k === 'stock' ? (v === '' ? 0 : Number(v)) : v } : sk,
      ),
    );
  }
  function removeSku(i: number) {
    setSkus((s) => s.filter((_, idx) => idx !== i));
  }

  // ---- 规格组（可多个，每组多个值，中韩双语）----
  function addSpec() {
    setSpecs((sp) => [...sp, { name: '', nameZh: '', values: [{ ko: '', zh: '' }] }]);
  }
  function updateSpec(i: number, patch: Partial<{ name: string; nameZh: string }>) {
    setSpecs((sp) => sp.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeSpec(i: number) {
    setSpecs((sp) => sp.filter((_, idx) => idx !== i));
  }
  function addSpecValue(i: number) {
    setSpecs((sp) =>
      sp.map((x, idx) =>
        idx === i ? { ...x, values: [...x.values, { ko: '', zh: '' }] } : x,
      ),
    );
  }
  function updateSpecValue(i: number, vi: number, patch: { ko?: string; zh?: string }) {
    setSpecs((sp) =>
      sp.map((x, idx) =>
        idx === i
          ? { ...x, values: x.values.map((v, j) => (j === vi ? { ...v, ...patch } : v)) }
          : x,
      ),
    );
  }
  function removeSpecValue(i: number, vi: number) {
    setSpecs((sp) =>
      sp.map((x, idx) =>
        idx === i ? { ...x, values: x.values.filter((_, j) => j !== vi) } : x,
      ),
    );
  }
  /** 按规格值笛卡尔积一键生成所有组合的 SKU 行（已存在的组合保留原库存/价格） */
  function generateSkuMatrix() {
    const valid = specs.filter((sp) => sp.name.trim() && sp.values.some((v) => v.ko.trim()));
    if (valid.length === 0) {
      setErr(t.pErrSpec);
      return;
    }
    let combos: Record<string, string>[] = [{}];
    for (const sp of valid) {
      const vals = sp.values.map((v) => v.ko.trim()).filter(Boolean);
      const next: Record<string, string>[] = [];
      for (const c of combos) for (const v of vals) next.push({ ...c, [sp.name.trim()]: v });
      combos = next;
    }
    const key = (o: Record<string, string>) =>
      Object.keys(o)
        .sort()
        .map((k) => `${k}=${o[k]}`)
        .join('|');
    const existing = new Map(skus.map((s) => [key(s.options), s]));
    setSkus(combos.map((c) => existing.get(key(c)) ?? { options: c, stock: 0, price: '' }));
  }

  async function uploadFiles(list: FileList) {
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append('files', f));
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const d = await res.json();
        const added: string[] = d.urls ?? (d.url ? [d.url] : []);
        setImages((prev) => [...(prev ? prev.split(/[\n]/).filter(Boolean) : []), ...added].join('\n'));
      } else {
        setErr(t.uploadFailed);
      }
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name || !categoryId || !(Number(price) > 0)) {
      setErr(t.pErrBase);
      return;
    }
    setSaving(true);
    const payload = {
      name,
      nameZh: nameZh || undefined,
      code: code || undefined,
      gender: gender || undefined,
      brandId: brandId || undefined,
      categoryId,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      status,
      description: description || undefined,
      descriptionZh: descriptionZh || undefined,
      tags: tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      images: images
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean),
      // 积分配置
      earnPoints,
      earnType,
      earnValue: earnValue === '' ? 0 : Number(earnValue),
      usePoints,
      maxPointUse: maxPointUse === '' ? 0 : Number(maxPointUse),
      // 购买赠送优惠券
      grantCouponIds,
      skus: skus.map((s) => ({
        id: s.id,
        options: s.options,
        stock: Number(s.stock) || 0,
        price: s.price === '' ? undefined : Number(s.price),
      })),
      specs: specs
        .filter((sp) => sp.name.trim() && sp.values.some((v) => v.ko.trim()))
        .map((sp) => ({
          name: sp.name.trim(),
          nameZh: sp.nameZh?.trim() || undefined,
          values: sp.values.filter((v) => v.ko.trim()),
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
        className="bg-bg w-full max-w-2xl my-8 border border-line p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-2xl text-ink">
            {editing ? t.editProduct : t.newProduct}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>{t.pNameKo}</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className={label}>{t.pNameZh}</label>
            <input className={input} value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.code}</label>
            <input className={input} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.gender}</label>
            <select className={input} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">—</option>
              <option value="men">{t.pGenderMen}</option>
              <option value="women">{t.pGenderWomen}</option>
              <option value="unisex">{t.pGenderUnisex}</option>
            </select>
          </div>
          <div>
            <label className={label}>{t.brand}</label>
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
            <label className={label}>{t.category} *</label>
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
            <label className={label}>{t.pPriceWon}</label>
            <input
              type="number"
              className={input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>{t.pComparePrice}</label>
            <input
              type="number"
              className={input}
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{t.status}</label>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">{t.draft}</option>
              <option value="active">{t.active}</option>
              <option value="archived">{t.archived}</option>
            </select>
          </div>
        </div>

        {/* ---------- 积分配置 ---------- */}
        <div className="border border-line p-4 space-y-4">
          <div>
            <h3 className="font-display text-lg text-ink">{t.pointSettings}</h3>
            <p className="text-[11px] text-muted mt-1">
              {t.pPointsHint}
            </p>
          </div>

          {/* 返积分 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={earnPoints}
                onChange={(e) => setEarnPoints(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-ink">{t.pEarnToggle}</span>
            </label>
            {earnPoints && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className={label}>{t.pEarnType}</label>
                  <select
                    className={input}
                    value={earnType}
                    onChange={(e) => setEarnType(e.target.value)}
                  >
                    <option value="percent">{t.pEarnTypePercent}</option>
                    <option value="fixed">{t.pEarnTypeFixed}</option>
                  </select>
                </div>
                <div>
                  <label className={label}>
                    {earnType === 'fixed' ? t.pEarnFixedLabel : t.pEarnPercentLabel}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={input}
                    value={earnValue}
                    placeholder={earnType === 'fixed' ? t.pEarnPhFixed : t.pEarnPhPercent}
                    onChange={(e) => setEarnValue(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 用积分 */}
          <div className="space-y-2 border-t border-line pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-ink">{t.pUseToggle}</span>
            </label>
            {usePoints && (
              <div className="pl-6">
                <label className={label}>{t.pMaxUseLabel}</label>
                <input
                  type="number"
                  min={0}
                  className={input + ' max-w-[240px]'}
                  value={maxPointUse}
                  placeholder={t.pMaxUsePh}
                  onChange={(e) => setMaxPointUse(e.target.value)}
                />
                <p className="text-[11px] text-muted mt-1">
                  {t.pMaxUseHint}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------- 购买赠送优惠券 ---------- */}
        <div className="border border-line p-4 space-y-3">
          <div>
            <h3 className="font-display text-lg text-ink">{t.pCouponTitle}</h3>
            <p className="text-[11px] text-muted mt-1">
              {t.pCouponHint}
            </p>
          </div>
          {coupons.length === 0 ? (
            <p className="text-xs text-muted">
              {t.pCouponEmpty}
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {coupons.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-surface-2 px-1 py-1"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={grantCouponIds.includes(c.id)}
                    onChange={(e) =>
                      setGrantCouponIds((ids) =>
                        e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id),
                      )
                    }
                  />
                  <span className="text-sm text-ink font-medium">{c.code}</span>
                  <span className="text-xs text-muted">
                    {c.type === 'percent'
                      ? t.pCouponPercent.replace('{n}', String(c.value))
                      : t.pCouponFixed.replace('{n}', c.value.toLocaleString())}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>{t.pDescKo}</label>
            <textarea
              className={input}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{t.pDescZh}</label>
            <textarea
              className={input}
              rows={3}
              value={descriptionZh}
              onChange={(e) => setDescriptionZh(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={label}>{t.pTags}</label>
          <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <label className={label}>{t.pImages}</label>
          <textarea
            className={input}
            rows={2}
            value={images}
            onChange={(e) => setImages(e.target.value)}
            placeholder={t.pImagesPh}
          />
          <div className="mt-2 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              id="img-upload"
              className="text-xs"
              onChange={async (e) => {
                if (e.target.files?.length) await uploadFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {uploading && <span className="text-xs text-muted">{t.pUploading}</span>}
            <span className="text-[10px] text-muted">{t.pUploadTip}</span>
          </div>
          <p className="text-[10px] text-muted mt-1">
            {t.pImageSpec}
          </p>
          {images.trim() && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {images
                .split(/[\n,]/)
                .map((x) => x.trim())
                .filter(Boolean)
                .map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-12 h-12 object-cover border border-line"
                  />
                ))}
            </div>
          )}
        </div>

        {/* ---------- 规格组：可添加多个规格，每个规格多个值（中韩双语） ---------- */}
        <div className="border border-line p-3">
          <div className="flex justify-between items-center mb-2">
            <label className={label + ' mb-0'}>
              {t.pSpecTitle}
            </label>
            <button type="button" onClick={addSpec} className="text-xs text-accent hover:underline">
              + {t.pAddSpec}
            </button>
          </div>

          <div className="space-y-3">
            {specs.map((sp, i) => (
              <div key={i} className="bg-surface-alt/40 border border-line/60 p-3">
                <div className="flex gap-2 items-center mb-2">
                  <input
                    className={input}
                    placeholder={t.pSpecNameKo}
                    value={sp.name}
                    onChange={(e) => updateSpec(i, { name: e.target.value })}
                  />
                  <input
                    className={input}
                    placeholder={t.pSpecNameZh}
                    value={sp.nameZh ?? ''}
                    onChange={(e) => updateSpec(i, { nameZh: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(i)}
                    className="text-red-600 text-xs px-2 whitespace-nowrap"
                  >
                    {t.pDelSpec}
                  </button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-line">
                  {sp.values.map((v, vi) => (
                    <div key={vi} className="flex gap-2 items-center">
                      <input
                        className={input}
                        placeholder={t.pSpecValKo}
                        value={v.ko}
                        onChange={(e) => updateSpecValue(i, vi, { ko: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder={t.pSpecValZh}
                        value={v.zh ?? ''}
                        onChange={(e) => updateSpecValue(i, vi, { zh: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecValue(i, vi)}
                        className="text-muted hover:text-red-600 text-xs px-2"
                        title={t.pDelSpecVal}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSpecValue(i)}
                    className="text-xs text-accent hover:underline"
                  >
                    + {t.pAddSpecVal}
                  </button>
                </div>
              </div>
            ))}
            {specs.length === 0 && (
              <p className="text-xs text-muted">
                {t.pSpecEmpty}
              </p>
            )}
          </div>
        </div>

        {/* ---------- SKU 库存：按上面的规格生成组合 ---------- */}
        <div>
          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <label className={label + ' mb-0'}>
              {t.pSkuTitle}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={generateSkuMatrix}
                className="text-xs text-accent hover:underline"
              >
                {t.pGenSku}
              </button>
              <button
                type="button"
                onClick={addSku}
                className="text-xs text-accent hover:underline"
              >
                + {t.pAddSkuRow}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {skus.length > 0 && (
              <div className="flex gap-2 items-center text-[11px] text-muted">
                {specs
                  .filter((sp) => sp.name.trim())
                  .map((sp, i) => (
                    <span key={i} className="flex-1">
                      {sp.nameZh || sp.name}
                    </span>
                  ))}
                <span className="w-20">{t.pStockCol}</span>
                <span className="w-24">{t.pPriceCol}</span>
                <span className="w-10" />
              </div>
            )}
            {skus.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                {specs
                  .filter((sp) => sp.name.trim())
                  .map((sp, si) => (
                    <select
                      key={si}
                      className={input + ' flex-1'}
                      value={s.options[sp.name.trim()] ?? ''}
                      onChange={(e) => updateSkuOpt(i, sp.name.trim(), e.target.value)}
                    >
                      <option value="">{t.pSelectPh}</option>
                      {sp.values
                        .filter((v) => v.ko.trim())
                        .map((v, vi) => (
                          <option key={vi} value={v.ko.trim()}>
                            {v.ko.trim()}
                          </option>
                        ))}
                    </select>
                  ))}
                <input
                  type="number"
                  className={input + ' w-20'}
                  placeholder={t.pStockPh}
                  value={s.stock}
                  onChange={(e) => updateSkuNum(i, 'stock', e.target.value)}
                />
                <input
                  type="number"
                  className={input + ' w-24'}
                  placeholder={t.pPricePh}
                  value={s.price}
                  onChange={(e) => updateSkuNum(i, 'price', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSku(i)}
                  className="text-red-600 text-xs px-2 w-10"
                >
                  {t.delete}
                </button>
              </div>
            ))}
            {skus.length === 0 && (
              <p className="text-xs text-muted">{t.pSkuEmpty}</p>
            )}
          </div>
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
