'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useCart } from '@/lib/cart-store';
import { productName } from '@/lib/format';
import type { ProductDetail, ProductSpecView } from '@/lib/types';

/** 商品没配规格组时，从已有 SKU 的 options 反推，保证老商品也能多选 */
function specsFromSkus(product: ProductDetail): ProductSpecView[] {
  const map = new Map<string, Set<string>>();
  for (const sk of product.skus) {
    for (const [k, v] of Object.entries(sk.options ?? {})) {
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

export function AddToCart({ product }: { product: ProductDetail }) {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const { user } = useAuth();

  const groups = useMemo<ProductSpecView[]>(
    () => (product.specs?.length ? product.specs : specsFromSkus(product)),
    [product],
  );

  // 当前选中的规格组合：{ 规格名: 规格值 }
  const [selected, setSelected] = useState<Record<string, string>>({});

  // 规格变化时默认选中第一个有库存的值
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, string> = {};
      for (const g of groups) {
        const vals = g.values.map((v) => v.ko).filter(Boolean);
        if (!vals.length) continue;
        next[g.name] = prev[g.name] && vals.includes(prev[g.name]) ? prev[g.name] : vals[0];
      }
      return next;
    });
  }, [groups]);

  // 规格值显示名：中文页优先中文
  const valueLabel = (g: ProductSpecView, ko: string) =>
    locale === 'zh' ? g.values.find((v) => v.ko === ko)?.zh || ko : ko;
  const groupLabel = (g: ProductSpecView) =>
    locale === 'zh' ? g.nameZh || g.name : g.name;

  // 匹配当前组合对应的 SKU
  const matchedSku = useMemo(() => {
    const keys = Object.keys(selected).filter((k) => selected[k]);
    if (!keys.length) return undefined;
    return product.skus.find((s) =>
      keys.every((k) => (s.options ?? {})[k] === selected[k]),
    );
  }, [product.skus, selected]);

  const unitPrice = matchedSku?.price ?? product.price;
  const stock =
    product.skus.length === 0 ? 999 : matchedSku ? matchedSku.stock : 0;
  const soldOut = product.skus.length > 0 && stock <= 0;
  const [added, setAdded] = useState(false);
  // 未登录点加购/购买时的提示
  const [needAuth, setNeedAuth] = useState(false);

  // 购物车里显示的规格摘要（中文页用中文）
  const variantLabel = groups
    .map((g) => (selected[g.name] ? `${groupLabel(g)}:${valueLabel(g, selected[g.name])}` : ''))
    .filter(Boolean)
    .join(' / ');

  function addCurrent() {
    add({
      slug: product.slug,
      name: productName(product, locale),
      brandCode: product.brandCode,
      price: unitPrice,
      image: product.image,
      size: variantLabel || undefined,
      options: { ...selected },
    });
  }

  const handleAdd = () => {
    if (!user) {
      setNeedAuth(true);
      return;
    }
    addCurrent();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // 「立即购买」= 加购当前规格后直接进结算（之前和加购同逻辑，是个 bug）
  const handleBuyNow = () => {
    if (!user) {
      setNeedAuth(true);
      return;
    }
    addCurrent();
    router.push(`/${locale}/checkout`);
  };

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const vals = g.values.map((v) => v.ko).filter(Boolean);
        if (!vals.length) return null;
        const cur = selected[g.name];
        return (
          <div key={g.name}>
            <p className="text-xs tracking-widest text-muted mb-2">
              {groupLabel(g)}
              {cur && (
                <span className="ml-2 text-ink not-italic tracking-normal">
                  {valueLabel(g, cur)}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {vals.map((v) => {
                const active = cur === v;
                // 该值是否还有库存
                const out = product.skus.length
                  ? !product.skus.some(
                      (s) =>
                        (s.options ?? {})[g.name] === v &&
                        s.stock > 0 &&
                        Object.keys(selected).every(
                          (k) =>
                            k === g.name || !selected[k] || (s.options ?? {})[k] === selected[k],
                        ),
                    )
                  : false;
                return (
                  <button
                    key={v}
                    onClick={() => setSelected((p) => ({ ...p, [g.name]: v }))}
                    disabled={out}
                    className={`min-w-[3rem] h-11 px-3 border text-sm transition-all duration-200 ${
                      active
                        ? 'border-ink bg-ink text-white'
                        : out
                          ? 'border-line text-muted/40 line-through cursor-not-allowed'
                          : 'border-line hover:border-ink active:scale-[0.98]'
                    }`}
                  >
                    {valueLabel(g, v)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {product.skus.length > 0 && !soldOut && (
        <p className="text-xs text-muted">
          {dict.common.stockCount.replace('{n}', String(stock))}
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={handleAdd} className="btn-gold flex-1" disabled={soldOut}>
          {soldOut
            ? dict.common.outOfStock
            : added
              ? '✓ ' + dict.common.addToCart
              : dict.common.addToCart}
        </button>
        <button onClick={handleBuyNow} className="btn-outline flex-1" disabled={soldOut}>
          {dict.common.buyNow}
        </button>
      </div>
      {soldOut && (
        <p className="text-xs text-red-600">
          {dict.product.variantSoldOut ?? dict.common.outOfStock}
        </p>
      )}
      {needAuth && !user && (
        <div className="border border-accent/50 bg-accent/5 p-4 text-sm">
          <p className="text-ink mb-1">
            {dict.checkout.loginRequired}
          </p>
          <p className="text-xs text-muted mb-3">
            {dict.checkout.loginRequiredDesc}
          </p>
          <div className="flex gap-3">
            <Link href={`/${locale}/register`} className="btn-gold text-xs px-4 py-2">
              {dict.checkout.goRegister}
            </Link>
            <Link href={`/${locale}/login`} className="btn-outline text-xs px-4 py-2">
              {dict.checkout.goLogin}
            </Link>
            <button
              onClick={() => setNeedAuth(false)}
              className="text-xs text-muted hover:text-ink px-2"
            >
              {dict.common.later}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
