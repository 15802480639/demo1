'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { defaultLocale, type Locale } from '@/i18n/config';

/**
 * 聊天里的商品卡片 —— 访客把商品发给客服后，客服端看到的可点击卡片。
 *
 * 数据实时取自 /api/chat/product?slug=（消息里只存 slug，不存快照），
 * 所以价格/库存永远是当前值，不会出现"客服照着过期报价回复"。
 *
 * ⚠️ 卡片文案按 locale 输出：客服端传 'ko'（客服是韩国人），
 *    访客端传当前页面语种 → 同一张卡片两边都能读懂。
 */

export type ProductCardData = {
  slug: string;
  name: string;
  nameZh?: string | null;
  price: number;
  currency: string;
  image: string | null;
  url: string;
  /** 站内相对路径 —— 优先用于点击跳转（跟随当前主机） */
  path?: string;
  inStock: boolean;
  stock: number;
};

/** 卡片内的固定文案（按显示语种） */
const CARD_TEXT: Record<string, { loading: string; missing: string; inStock: string; outOfStock: string; detail: string }> = {
  ko: {
    loading: '상품 불러오는 중…',
    missing: '판매가 중단되었거나 존재하지 않는 상품입니다',
    inStock: '재고 있음',
    outOfStock: '재고 없음',
    detail: '상품 상세 보기 ↗',
  },
  zh: {
    loading: '商品加载中…',
    missing: '该商品已下架或不存在',
    inStock: '有货',
    outOfStock: '暂时缺货',
    detail: '点击查看商品详情 ↗',
  },
  en: {
    loading: 'Loading item…',
    missing: 'This item is unavailable or no longer exists',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    detail: 'View item details ↗',
  },
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
  // 文案语种：跟随卡片显示语种；未知语种回退韩文（客服台默认）
  const text = CARD_TEXT[String(locale)] ?? CARD_TEXT.ko;

  if (loading) {
    return (
      <div
        className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${
          dark ? 'border-white/20 text-white/60' : 'border-line text-muted'
        }`}
      >
        {text.loading}
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
        {text.missing}
      </div>
    );
  }

  const displayName =
    String(locale) === 'zh' ? data.nameZh || data.name : data.name;

  return (
    <a
      // ⚠️ 优先用站内相对路径：跟随用户当前访问的主机。
      //    写死 https://www.mk.golf/... 时，若该域名 DNS/证书失效，
      //    客服点卡片就是 ERR_QUIC_PROTOCOL_ERROR，商品页完全打不开。
      //    后端没给 path 时（旧缓存）才退回绝对 URL。
      href={data.path || data.url}
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
            {data.inStock ? text.inStock : text.outOfStock}
          </span>
        </p>
        <p
          className={`mt-0.5 text-[10px] ${
            dark ? 'text-white/50' : 'text-accent'
          }`}
        >
          {text.detail}
        </p>
      </div>
    </a>
  );
}
