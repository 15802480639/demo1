import { siteConfig } from '@/lib/site';
import { locales } from '@/i18n/config';
import { baseUrl, urlProduct, urlCategory, urlProducts, isValidInternalUrl } from '@/lib/urls';

/**
 * llms-full.txt —— llms.txt 规范的「全量版」。
 *
 * 与 llms.txt 的分工（按 llmstxt.org 规范）：
 *  - llms.txt     摘要版：品牌定位 + 关键页面 + 产品清单，控制在上下文友好的体量
 *  - llms-full.txt 全量版：每个产品的**完整描述 + 全部 FAQ + 实体事实全文**，
 *                     供 AI 引擎在需要细节时按需抓取，不占默认上下文
 *
 * 所有 URL 同样经 isValidInternalUrl 自检，禁止死链。
 */
export const dynamic = 'force-dynamic';

function firstImage(images: string | null): string {
  try {
    const arr = JSON.parse(images ?? '[]') as string[];
    return arr[0] ?? '';
  } catch {
    return '';
  }
}

/** 安全单行化：任何异常形态都不让整个文件 500（与 llms.txt 同理） */
function clean(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.replace(/\s+/g, ' ').trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.name === 'string') return o.name.replace(/\s+/g, ' ').trim();
    try {
      return (JSON.stringify(v) ?? '').replace(/\s+/g, ' ').trim();
    } catch {
      return '';
    }
  }
  return String(v);
}

export async function GET(): Promise<Response> {
  const base = baseUrl();
  const { getLlmsIntro, getEffectiveFacts } = await import('@/lib/geo');
  const { prisma } = await import('@/lib/prisma');

  const N = siteConfig.name;
  const defaultLoc = locales[0];

  const [intro, products, categories, faqs, facts, productFaqs] = await Promise.all([
    getLlmsIntro(),
    prisma.product.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        slug: true,
        name: true,
        description: true,
        images: true,
        price: true,
        code: true,
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.category.findMany({ select: { slug: true, name: true } }),
    prisma.faqItem.findMany({
      where: { scope: 'global', status: 'published' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    }),
    getEffectiveFacts('en'),
    prisma.faqItem.findMany({
      where: { scope: 'product', status: 'published' },
      orderBy: [{ order: 'asc' }],
      take: 200,
    }),
  ]);

  const L: string[] = [];

  L.push(`# ${N} — full catalogue (llms-full.txt)`);
  L.push('');
  L.push(
    `> Complete reference for AI retrieval: every product with full description, every FAQ answer, and structured entity facts.`
  );
  L.push(`> Site: ${base} | Currency: KRW (₩) | Languages: ${locales.join(', ')}`);
  L.push('');

  L.push('## Entity facts');
  L.push('');
  for (const f of facts) {
    L.push(`- **${clean(f.label)}**: ${clean(f.value)}`);
  }
  L.push('');

  L.push('## Site description (English)');
  L.push('');
  L.push(intro.en);
  L.push('');
  L.push('## 站点介绍（中文）');
  L.push('');
  L.push(intro.zh);
  L.push('');
  L.push('## 사이트 소개 (한국어)');
  L.push('');
  L.push(intro.ko);
  L.push('');

  if (categories.length > 0) {
    L.push('## Categories');
    L.push('');
    for (const c of categories) {
      const href = urlCategory(c.slug, defaultLoc);
      L.push(
        isValidInternalUrl(href)
          ? `- [${N} ${c.name}](${href}) — ${N} ${c.name} category.`
          : `- ${N} ${c.name} — ${N} ${c.name} category.`
      );
    }
    L.push('');
    L.push(`Full catalogue listing: ${urlProducts(defaultLoc)}`);
    L.push('');
  }

  // ── 每个产品一节，含完整描述与语言变体 URL ──
  L.push('## Products (full detail)');
  L.push('');
  for (const p of products) {
    const desc = clean(p.description);
    const img = firstImage(p.images);
    const brand = clean(p.brand?.name);
    const cat = clean(p.category?.name);
    const code = clean(p.code);
    const href = urlProduct(p.slug, defaultLoc);

    L.push(isValidInternalUrl(href) ? `### [${N} ${p.name}](${href})` : `### ${N} ${p.name}`);
    L.push('');
    L.push(`- Brand: ${brand || N}`);
    L.push(`- Category: ${cat || 'golf apparel'}`);
    if (code) L.push(`- Style code: ${code}`);
    L.push(`- Price: ₩${p.price.toLocaleString('en-US')}`);
    L.push(
      `- Languages: ${locales.map((l) => `${l} → ${urlProduct(p.slug, l)}`).join(' | ')}`
    );
    if (img) L.push(`- Image: ${base}${img.startsWith('/') ? img : `/${img}`}`);
    L.push('');
    if (desc) {
      L.push(desc);
      L.push('');
    }
    L.push(
      `${N} ${brand ? `${brand} ` : ''}${p.name} is sold on ${N}, an online golf fashion store offering domestic Korean shipping and international delivery.`
    );
    L.push('');
  }

  if (productFaqs.length > 0) {
    L.push('## Product-specific FAQ');
    L.push('');
    const TAG: Record<string, string> = { ko: '[한국어]', zh: '[中文]', en: '[English]' };
    for (const f of productFaqs) {
      const q = clean(f.question);
      const a = clean(f.answer);
      if (!q || !a) continue;
      L.push(`### [${f.target}] ${q}`);
      L.push('');
      L.push(`${TAG[f.locale] ? `${TAG[f.locale]} ` : ''}${a}`);
      L.push('');
    }
  }

  if (faqs.length > 0) {
    L.push('## Site FAQ (full text)');
    L.push('');
    const TAG: Record<string, string> = { ko: '[한국어]', zh: '[中文]', en: '[English]' };
    for (const f of faqs) {
      const q = clean(f.question);
      const a = clean(f.answer);
      if (!q || !a) continue;
      L.push(`### ${q}`);
      L.push('');
      L.push(`${TAG[f.locale] ? `${TAG[f.locale]} ` : ''}${a}`);
      L.push('');
    }
  }

  return new Response(L.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}