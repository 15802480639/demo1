import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { urlProduct } from '@/lib/urls';
import { normalizeSlug, isLocale } from '@/lib/chat-product';
import { defaultLocale } from '@/i18n/config';

// GET /api/chat/product?slug=xxx&locale=zh —— 客服/访客端渲染商品卡片用的轻接口
//
// 为什么不在消息里存商品快照？
//   → 快照会过期（价格改了、库存变了），客服照着快照报价就是错的。
//   这里按 slug 实时查，商品上下架/改价自动生效。
//   消息里只存 slug（ChatMessage.productSlug），落地成本极低。
//
// 公开接口：只暴露前台本来就公开的商品信息（名称/价格/图/链接），无任何敏感数据。

type Card = {
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

/** 60 秒内存缓存：同一 slug 被两端反复渲染，别把库打穿 */
const cache = new Map<string, { at: number; data: Card | null }>();
const TTL = 60_000;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = normalizeSlug(sp.get('slug') || '');
  if (!slug) {
    return NextResponse.json({ error: 'BAD_SLUG' }, { status: 400 });
  }

  const locParam = sp.get('locale');
  const locale = isLocale(locParam) ? locParam : defaultLocale;

  const ck = `${slug}|${locale}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ product: hit.data, cached: true });
  }

  let card: Card | null = null;
  try {
    const p = await prisma.product.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        nameZh: true,
        price: true,
        currency: true,
        images: true,
        status: true,
        skus: { select: { stock: true } },
      },
    });

    if (p && p.status === 'active') {
      let image: string | null = null;
      try {
        const arr = JSON.parse(p.images ?? '[]');
        if (Array.isArray(arr) && typeof arr[0] === 'string') image = arr[0];
      } catch {
        /* images 解析失败 → 无图 */
      }
      const stock = (p.skus as unknown as { stock?: number }[]).reduce(
        (s, k) => s + (k.stock ?? 0),
        0
      );
      card = {
        slug: p.slug,
        name: p.name,
        nameZh: p.nameZh ?? null,
        price: p.price,
        currency: p.currency || 'KRW',
        image,
        // ⚠️ 链接一律走 urls.ts 的 urlProduct()，禁止手拼（漏 locale 段会 404）
        url: urlProduct(p.slug, locale),
        inStock: stock > 0,
        stock,
      };
    }
  } catch {
    card = null;
  }

  cache.set(ck, { at: Date.now(), data: card });
  return NextResponse.json({ product: card });
}

export const dynamic = 'force-dynamic';
