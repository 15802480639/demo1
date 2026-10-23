'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
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
  useLocale(); // 后台固定中文
  const t = getDictionary('zh').admin;
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
          <p className="text-xs text-muted mt-1">
            商品挂在「分类管理」的分类下；点「编辑」可管理规格（SKU）、上传图片、填写中韩双语名称。
          </p>
        </div>
        <button onClick={openNew} className="btn-gold">
          + 新增商品
        </button>
      </div>

      {/* 筛选查找 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索：商品名 / 货号 / slug"
          className="border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent w-64"
        />
        <select className={select} value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={select} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="active">在售</option>
          <option value="draft">草稿</option>
          <option value="archived">已归档</option>
        </select>
        <span className="text-xs text-muted self-center">
          {filtered.length} / {products.length} 个商品
        </span>
      </div>

      {loading ? (
        <p className="text-muted">加载中…</p>
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
                    {p.skus.length} 个规格
                    {grantedCouponCodes(p.grantCouponIds, coupons).length > 0 &&
                      ` · 赠券 ${grantedCouponCodes(p.grantCouponIds, coupons).join('、')}`}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    积分：
                    {p.earnPoints
                      ? p.earnType === 'fixed'
                        ? `每件返 ${p.earnValue} 分`
                        : p.earnValue > 0
                          ? `返 ${p.earnValue}%`
                          : '返积分（用全局比例）'
                      : '不返积分'}
                    {' · '}
                    {p.usePoints ? '可用积分抵扣' : '不可用积分抵扣'}
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
                  {productStatusLabel(p.status)}
                </span>
                <button
                  onClick={() => openEdit(p)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-ink"
                >
                  编辑
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-xs px-3 py-1.5 border border-line hover:border-red-500 text-red-600"
                >
                  删除
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-5 text-sm text-muted">
              {products.length === 0 ? '还没有商品，点右上角「新增商品」创建。' : '没有符合筛选条件的商品。'}
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
            上一页
          </button>
          <span className="text-muted text-xs">
            第 {safePage} / {totalPages} 页 · 共 {filtered.length} 条
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 border border-line hover:border-ink disabled:opacity-40"
          >
            下一页
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
  const t = getDictionary('zh').admin;
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
      setErr('请先填写至少一个规格名和它的规格值');
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
      setErr('请填写：商品名（韩语）、分类、价格');
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
            {editing ? '编辑商品' : '新增商品'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>商品名（韩语）*</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className={label}>商品名（中文）— 中文页面优先显示</label>
            <input className={input} value={nameZh} onChange={(e) => setNameZh(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.code}</label>
            <input className={input} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className={label}>适用性别</label>
            <select className={input} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">—</option>
              <option value="men">男装</option>
              <option value="women">女装</option>
              <option value="unisex">通用</option>
            </select>
          </div>
          <div>
            <label className={label}>品牌</label>
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
            <label className={label}>分类 *</label>
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
            <label className={label}>价格（₩）*</label>
            <input
              type="number"
              className={input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>划线价（₩）</label>
            <input
              type="number"
              className={input}
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>状态</label>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">草稿</option>
              <option value="active">在售</option>
              <option value="archived">已归档</option>
            </select>
          </div>
        </div>

        {/* ---------- 积分配置 ---------- */}
        <div className="border border-line p-4 space-y-4">
          <div>
            <h3 className="font-display text-lg text-ink">积分设置</h3>
            <p className="text-[11px] text-muted mt-1">
              控制这个商品「买完给不给积分」和「能不能用积分抵扣」。全局默认值在「积分设置」页。
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
              <span className="text-sm text-ink">购买本商品可以获得积分</span>
            </label>
            {earnPoints && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className={label}>返积分方式</label>
                  <select
                    className={input}
                    value={earnType}
                    onChange={(e) => setEarnType(e.target.value)}
                  >
                    <option value="percent">按实付金额百分比</option>
                    <option value="fixed">按件固定返</option>
                  </select>
                </div>
                <div>
                  <label className={label}>
                    {earnType === 'fixed' ? '每件返多少积分' : '返积分比例（%）'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={input}
                    value={earnValue}
                    placeholder={earnType === 'fixed' ? '如 500' : '留空 = 用全局比例'}
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
              <span className="text-sm text-ink">本商品可以使用积分抵扣</span>
            </label>
            {usePoints && (
              <div className="pl-6">
                <label className={label}>本商品单笔最多可用积分数</label>
                <input
                  type="number"
                  min={0}
                  className={input + ' max-w-[240px]'}
                  value={maxPointUse}
                  placeholder="留空 = 不单独限制"
                  onChange={(e) => setMaxPointUse(e.target.value)}
                />
                <p className="text-[11px] text-muted mt-1">
                  留空表示跟随全局上限（单笔最多抵订单金额的设定百分比）。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------- 购买赠送优惠券 ---------- */}
        <div className="border border-line p-4 space-y-3">
          <div>
            <h3 className="font-display text-lg text-ink">购买赠送优惠券</h3>
            <p className="text-[11px] text-muted mt-1">
              勾选后，客户购买本商品且订单支付成功，这张券会自动发到客户账户的「我的优惠券」里，结算时可直接用。不勾 = 不赠送。
            </p>
          </div>
          {coupons.length === 0 ? (
            <p className="text-xs text-muted">
              还没有创建优惠券 —— 请先在「优惠券」页创建，再回到这里勾选。
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
                      ? `打折 ${c.value}%`
                      : `立减 ₩${c.value.toLocaleString()}`}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>商品描述（韩语）</label>
            <textarea
              className={input}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>商品描述（中文）</label>
            <textarea
              className={input}
              rows={3}
              value={descriptionZh}
              onChange={(e) => setDescriptionZh(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={label}>标签（英文逗号分隔，如 new, sale）</label>
          <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <label className={label}>商品图（每行一个 URL，也可点下面按钮上传）</label>
          <textarea
            className={input}
            rows={2}
            value={images}
            onChange={(e) => setImages(e.target.value)}
            placeholder="https://... 或 /uploads/xxx.webp"
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
            {uploading && <span className="text-xs text-muted">上传中…</span>}
            <span className="text-[10px] text-muted">可按住 Ctrl 多选，一次传多张</span>
          </div>
          <p className="text-[10px] text-muted mt-1">
            建议尺寸 900×1200（3:4 竖图），第一张为主图；单张 ≤10MB，支持 jpg / png / webp
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
              商品规格（可添加多个：如 颜色 / 尺码 / 材质）
            </label>
            <button type="button" onClick={addSpec} className="text-xs text-accent hover:underline">
              + 添加规格
            </button>
          </div>

          <div className="space-y-3">
            {specs.map((sp, i) => (
              <div key={i} className="bg-surface-alt/40 border border-line/60 p-3">
                <div className="flex gap-2 items-center mb-2">
                  <input
                    className={input}
                    placeholder="规格名（韩语，如 색상）"
                    value={sp.name}
                    onChange={(e) => updateSpec(i, { name: e.target.value })}
                  />
                  <input
                    className={input}
                    placeholder="规格名（中文，如 颜色）"
                    value={sp.nameZh ?? ''}
                    onChange={(e) => updateSpec(i, { nameZh: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(i)}
                    className="text-red-600 text-xs px-2 whitespace-nowrap"
                  >
                    删除规格
                  </button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-line">
                  {sp.values.map((v, vi) => (
                    <div key={vi} className="flex gap-2 items-center">
                      <input
                        className={input}
                        placeholder="规格值（韩语，如 레드）"
                        value={v.ko}
                        onChange={(e) => updateSpecValue(i, vi, { ko: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder="规格值（中文，如 红色）"
                        value={v.zh ?? ''}
                        onChange={(e) => updateSpecValue(i, vi, { zh: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecValue(i, vi)}
                        className="text-muted hover:text-red-600 text-xs px-2"
                        title="删除该规格值"
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
                    + 添加规格值
                  </button>
                </div>
              </div>
            ))}
            {specs.length === 0 && (
              <p className="text-xs text-muted">
                还没有规格。点「+ 添加规格」可添加多个规格（颜色、尺码、材质…），每个规格可有多个值。
              </p>
            )}
          </div>
        </div>

        {/* ---------- SKU 库存：按上面的规格生成组合 ---------- */}
        <div>
          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <label className={label + ' mb-0'}>
              规格组合 / 库存（SKU）— 可添加、修改、删除
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={generateSkuMatrix}
                className="text-xs text-accent hover:underline"
              >
                按规格一键生成组合
              </button>
              <button
                type="button"
                onClick={addSku}
                className="text-xs text-accent hover:underline"
              >
                + 手动添加一行
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
                <span className="w-20">库存</span>
                <span className="w-24">价格</span>
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
                      <option value="">— 选择 —</option>
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
                  placeholder="库存"
                  value={s.stock}
                  onChange={(e) => updateSkuNum(i, 'stock', e.target.value)}
                />
                <input
                  type="number"
                  className={input + ' w-24'}
                  placeholder="留空用商品价"
                  value={s.price}
                  onChange={(e) => updateSkuNum(i, 'price', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSku(i)}
                  className="text-red-600 text-xs px-2 w-10"
                >
                  删除
                </button>
              </div>
            ))}
            {skus.length === 0 && (
              <p className="text-xs text-muted">还没有组合 — 不填的话商品按统一价格与无限库存售卖。</p>
            )}
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
