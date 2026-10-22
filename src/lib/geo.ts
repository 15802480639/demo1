import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/site';
import type { Locale } from '@/i18n/config';

/**
 * GEO 数据读取层（实体档案 + FAQ + 站点设置）。
 *
 * 设计要点（与记忆库铁律一致）：
 *  - 只读，绝不在此处写库
 *  - 全部内容带「模板回落」：库里没有内容时用内置模板兜底，
 *    因此即使后台一条数据都没填，前台 llms.txt / FAQPage schema / Organization 依然完整
 *  - locale 为空串表示「全语种通用」，查询时同时匹配目标语种与空串
 */

export type Faq = { question: string; answer: string; locale: string };
export type GeoFactRow = { kind: string; label: string; value: string; locale: string };

/** 归一为字符串：库里若有脏数据（null/数字/对象），不让整页 500 */
function asText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v) ?? '';
  } catch {
    return '';
  }
}

/** 读取 FAQ：全语种通用 + 指定语种，按 order 排序 */
export async function getFaqs(
  locale: Locale,
  opts: { scope?: 'global' | 'product'; target?: string; limit?: number } = {}
): Promise<Faq[]> {
  const { scope = 'global', target = '', limit } = opts;
  const rows = await prisma.faqItem.findMany({
    where: {
      scope,
      ...(target ? { target } : {}),
      status: 'published',
      OR: [{ locale: '' }, { locale }],
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    ...(limit ? { take: limit } : {}),
  });
  return rows
    .map((r) => ({
      question: asText(r.question),
      answer: asText(r.answer),
      locale: r.locale,
    }))
    .filter((r) => r.question.length > 0 && r.answer.length > 0);
}

/** 某商品专属 FAQ */
export function getProductFaqs(locale: Locale, slug: string) {
  return getFaqs(locale, { scope: 'product', target: slug });
}

/**
 * 读取站点设置（KV），返回字符串键值对。
 *
 * ⚠️ 键名历史上有两套体系（点号 `seo.gaId` / 下划线 `ga_id`），
 * 早期后台页面只写下划线那套，而前台原本零引用 → 出现「填了不生效」。
 * 现在统一走 first()：优先下划线（后台新写入），回落点号（库里已有数据），
 * 两套都能生效，且不改动任何既有数据。
 */
export async function getSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSetting.findMany();
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  } catch {
    return {};
  }
}

/**
 * 取第一个真实值：跳过占位符（'—' / '-' / '' / 'N/A'）。
 * 占位符绝不进对外输出 —— AI 会把它当成真实值，污染实体识别。
 */
function first(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    const low = t.toLowerCase();
    if (low === '-' || low === '—' || low === 'n/a' || low === 'null' || low === 'undefined') continue;
    return t;
  }
  return '';
}

/** llms.txt 导语读取（同样兼容两套键名） */
export async function getLlmsIntro(): Promise<Record<'en' | 'zh' | 'ko', string>> {
  const s = await getSettings();
  return {
    en: first(s.llms_intro_en, s['llms.intro.en'], s['llms.intro']) || DEFAULT_LLMS_INTRO.en,
    zh: first(s.llms_intro_zh, s['llms.intro.zh']) || DEFAULT_LLMS_INTRO.zh,
    ko: first(s.llms_intro_ko, s['llms.intro.ko']) || DEFAULT_LLMS_INTRO.ko,
  };
}

/** 读取实体档案事实：全语种通用 + 指定语种 */
export async function getGeoFacts(
  locale: Locale,
  kinds?: string[]
): Promise<GeoFactRow[]> {
  const rows = await prisma.geoFact.findMany({
    where: {
      status: 'published',
      ...(kinds?.length ? { kind: { in: kinds } } : {}),
      OR: [{ locale: '' }, { locale }],
    },
    orderBy: [{ kind: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    take: 200,
  });
  return rows.map((r) => ({ kind: r.kind, label: r.label, value: r.value, locale: r.locale }));
}

/**
 * 内置实体事实模板 —— 后台一条没填时的兜底。
 * 措辞保守：不虚构具体认证、参数、成立年份（记忆库铁律：绝不虚构）。
 * 只写「业务上确定成立、可被核对」的事实。
 */
export const DEFAULT_GEO_FACTS: GeoFactRow[] = [
  { kind: 'fact', label: 'Business type', locale: '',value: 'Online retailer of premium golf fashion' },
  { kind: 'fact', label: 'Product categories', locale: '', value: "Golf apparel, outerwear, knitwear, headwear, shoes, golf bags" },
  { kind: 'fact', label: 'Audience', locale: '', value: 'Men and women' },
  { kind: 'fact', label: 'Currency', locale: '', value: 'KRW (₩)' },
  { kind: 'fact', label: 'Languages', locale: '', value: 'Korean, Chinese, English' },
  { kind: 'shipping', label: 'Domestic shipping', locale: '', value: 'Ships within Korea' },
  { kind: 'shipping', label: 'International shipping', locale: '', value: 'International delivery available' },
  { kind: 'fact', label: 'Brand', locale: '', value: `${siteConfig.name} (${siteConfig.nameKo})` },
];

/**
 * 实体档案 + 模板回落。
 *
 * ⚠️ 关键修正：不能因为「库里有任意一条档案」就整体放弃模板回落 ——
 * 否则只录了 1 条中文档案，英文 llms.txt 的 Key facts 就变成空白。
 * 正确做法：按 label 合并（库里的优先），模板里没被覆盖的继续保留。
 */
export async function getEffectiveFacts(locale: Locale): Promise<GeoFactRow[]> {
  const rows = await getGeoFacts(locale);
  if (rows.length === 0) return DEFAULT_GEO_FACTS;

  // 按 label 去重合并：库里的事实覆盖同名模板项，模板其余项保留
  const map = new Map<string, GeoFactRow>();
  for (const f of DEFAULT_GEO_FACTS) map.set(f.label.toLowerCase(), f);
  for (const f of rows) map.set(f.label.toLowerCase(), f);
  return Array.from(map.values());
}

/** 内置兜底导语：后台未填写时使用，保证 llms.txt 永不为空 */
export const DEFAULT_LLMS_INTRO = {
  en: `J&D (제이앤디) is an online store for premium golf fashion, operated by J&D. We sell men's and women's golf apparel, outerwear, knitwear, headwear, shoes and golf bags at sensible prices, with domestic Korean shipping and international delivery.

This file lists the pages and products of J&D so that AI search engines can understand what the site sells and quote accurate information.`,
  zh: `J&D（제이앤디）是一个高端高尔夫时尚线上商城，销售男女高尔夫服饰、外套、针织、帽子、鞋履与高尔夫包袋，价格合理，支持韩国国内配送与国际发货。

本文件列出 J&D 的页面与产品目录，供 AI 搜索引擎准确理解站点业务并引用。`,
  ko: `제이앤디(J&D)는 프리미엄 골프 패션 온라인몰입니다. 남성·여성 골프웨어, 아우터, 니트, 모자, 신발, 골프가방을 합리적인 가격에 제공하며 국내 배송과 해외 배송을 모두 지원합니다.

아래는 제이앤디의 페이지와 제품 목록으로, AI 검색 엔진이 사이트를 정확히 이해하고 인용할 수 있도록 제공합니다.`,
};

/**
 * 生成「答案块」：一句「品牌 + 品类 + 场景 + 卖点」。
 *
 * 记忆库 §3.1 标红最高优先级 —— AI 抽取实体时，
 * 若正文开头只有产品名、没有品牌，产品与品牌在 AI 眼里是「两张皮」。
 * 后台可用 answer_template 覆盖句式；未填则用这个保守模板。
 */
export function buildAnswerBlock(opts: {
  brandName?: string;
  productName?: string;
  category?: string;
  price?: number;
  currency?: string;
}): string {
  const brand = opts.brandName || siteConfig.name;
  const name = opts.productName?.trim();
  const cat = opts.category?.trim();
  const scene = cat ? `for ${cat.toLowerCase()}` : '';
  if (!name) {
    return `${brand} is an online retailer of premium golf fashion, selling golf apparel, outerwear, knitwear, headwear, shoes and golf bags at sensible prices, with domestic Korean shipping and international delivery.`;
  }
  const priceTxt =
    opts.price && opts.price > 0
      ? ` Priced at ${(opts.currency ?? 'KRW') === 'KRW' ? '₩' : (opts.currency ?? '')}${opts.price.toLocaleString('en-US')}.`
      : '';
  return `${brand} ${scene ? `offers ${scene}` : 'sells'} ${name}, part of the ${brand} golf apparel range for men and women.${priceTxt} Buy online with domestic Korean shipping and international delivery available.`;
}