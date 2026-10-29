'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { defaultLocale, type Locale } from '@/i18n/config';

/**
 * 聊天里的商品卡片 —— 访客把商品发给客服后，客服端看到的可点击卡片。
 *
 * 数据实时取自 /api/chat/product?slug=（消息里只存 slug，不存快照），
 * 所以价格/库存永远是当前值，不会出现"客服照着过期报价回复"。
 */

export type ProductCardData = {
  slug: string;
  name: string;
  nameZh?: string | null;
  price: number;
  currency: string;
  image: string | null;
  url: string;
  inStock: boolean;
  stock: number;
};

export function ChatProductCard({
  slug,
  locale = defaultLocale,
  /** dark = 放在访客自己的深色气泡里；light = 放在客服端的浅色气泡里 */
  tone = 'light',
  onError,
}: {
  slug: string;
  locale?: Locale | string;
  tone?: 'dark' | 'light';
  onError?: (e: string) => void;
}) {
  const [data, setData] = useState<ProductCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    const loc = String(locale || defaultLocale);
    setLoading(true);
    setMissing(false);
    fetch(`/api/chat/product?slug=${encodeURIComponent(slug)}&locale=${encodeURIComponent(loc)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.product) setData(d.product as ProductCardData);
        else setMissing(true);
      })
      .catch((e) => {
        if (!alive) return;
        setMissing(true);
        onError?.(String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, locale]);

  const dark = tone === 'dark';

  if (loading) {
    return (
      <div
        className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${
          dark ? 'border-white/20 text-white/60' : 'border-line text-muted'
        }`}
      >
        商品加载中…
      </div>
    );
  }

  if (missing || !data) {
    return (
      <div
        className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${
          dark ? 'border-white/20 text-white/60' : 'border-line text-muted'
        }`}
      >
        该商品已下架或不存在
      </div>
    );
  }

  const displayName =
    String(locale) === 'zh' ? data.nameZh || data.name : data.name;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2.5 rounded-lg border p-2 transition hover:opacity-90 ${
        dark
          ? 'border-white/25 bg-white/10 hover:bg-white/15'
          : 'border-line bg-surface hover:bg-surface-2'
      }`}
    >
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          className="h-12 w-12 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className={`h-12 w-12 shrink-0 rounded ${
            dark ? 'bg-white/15' : 'bg-line/40'
          }`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${
            dark ? 'text-white' : 'text-ink'
          }`}
        >
          {displayName}
        </p>
        <p
          className={`mt-0.5 text-xs ${dark ? 'text-white/80' : 'text-ink-soft'}`}
        >
          {formatPrice(data.price, String(locale) as Locale)}
          <span className={dark ? 'text-white/50' : 'text-muted'}>
            {' · '}
            {data.inStock ? '有货' : '暂时缺货'}
          </span>
        </p>
        <p
          className={`mt-0.5 text-[10px] ${
            dark ? 'text-white/50' : 'text-accent'
          }`}
        >
          点击查看商品详情 ↗
        </p>
      </div>
    </a>
  );
}
