import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';
import { locales, type Locale } from '@/i18n/config';
import { getSettings, getGeoFacts } from '@/lib/geo';
import { getKakaoUrl } from '@/lib/kakao';

/**
 * SEO / GEO 基建层。
 *
 * 关键设计（对齐记忆库《B2B官网_GEO_SEO_全套可复用手册》）：
 *  1. 标题去重：只有当标题里**不含任何**品牌写法时才追加，避免重复后缀
 *  2. 描述限长：< 110 字符自动补品牌，> 320 字符硬截断
 *  3. hreflang：一次生成全部语种 + x-default，canonical 指向当前语种
 *  4. 所有 URL 走 siteConfig.url（构建期内联），**禁止硬编码 localhost**
 *  5. 后台「SEO 设置」页填的值（meta_title / og_image / 站长验证码等）必须能驱动前台输出，
 *     所以这里提供 async 的 metaVerificationTags / siteGreeting，**禁止再出现「填了不生效」的字段**
 */

const MAX_TITLE = 70;
const MAX_DESC = 320;
const MIN_DESC = 110;

const BRAND_ALIASES = [siteConfig.name, siteConfig.nameKo].filter(Boolean);

function hasBrand(text: string) {
  const t = text.toLowerCase();
  return BRAND_ALIASES.some((b) => b && t.includes(b.toLowerCase()));
}

/** 占位符过滤：'—' / '-' / '' / 'N/A' 一律视为「未填写」，绝不进 JSON-LD */
export function isPlaceholder(v?: string | null): boolean {
  if (!v) return true;
  const t = v.trim().toLowerCase();
  return t === '' || t === '-' || t === '—' || t === 'n/a' || t === 'null' || t === 'undefined';
}

/** 标题：不足 70 字符且不含品牌时补后缀，超长截断 */
export function clampTitle(input: string): string {
  let t = (input ?? '').trim();
  if (!t) t = siteConfig.name;
  if (!hasBrand(t) && t.length + siteConfig.name.length + 3 <= MAX_TITLE) {
    t = `${t} | ${siteConfig.name}`;
  }
  if (t.length > MAX_TITLE) t = t.slice(0, MAX_TITLE - 1).trimEnd() + '…';
  return t;
}

/** 描述：短于 110 字符自动补品牌长句，超过 320 字符截断 */
export function clampDesc(input: string, fallback?: string): string {
  let d = (input ?? '').trim() || (fallback ?? '').trim();
  if (!d) {
    d = `${siteConfig.name} — ${siteConfig.tagline}. Golf apparel, outerwear, knitwear, headwear and bags at sensible prices.`;
  }
  if (!hasBrand(d) && d.length < MIN_DESC) {
    d = `${d} ${siteConfig.name} offers authentic golf fashion with domestic and international shipping.`;
  }
  if (d.length > MAX_DESC) d = d.slice(0, MAX_DESC - 1).trimEnd() + '…';
  return d;
}

/** 多语种 alternate 链接 */
export function hreflangAlternates(pathWithoutLocale = '/'): Record<string, string> {
  const base = siteConfig.url.replace(/\/$/, '');
  const clean = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
  const out: Record<string, string> = {};
  for (const l of locales) out[l] = `${base}/${l}${clean}`;
  out['x-default'] = `${base}/${locales[0]}${clean}`;
  return out;
}

/** 统一 metadata 生成器 */
export function buildMetadata(opts: {
  locale: Locale;
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const { locale, title, description, path = '/', image, noIndex } = opts;
  const base = siteConfig.url.replace(/\/$/, '');
  const clean = path === '/' ? '' : path;
  const url = `${base}/${locale}${clean}`;
  const desc = clampDesc(description ?? '');
  const img = image ?? `${base}/og-default.png`;
  const t = clampTitle(title);

  return {
    title: t,
    description: desc,
    alternates: {
      canonical: url,
      languages: hreflangAlternates(clean),
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title: t,
      description: desc,
      url,
      locale,
      images: [{ url: img, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t,
      description: desc,
      images: [img],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/**
 * 取第一个**真实值**：自动跳过占位符（'—' / '-' / '' / 'N/A'）。
 *
 * 🔴 双重键名兼容：库里既存点号键（seo.googleVerify）与新下划线键并存，
 * 所以这里逐个候选尝试，全部跳过占位符后才返回。
 * 占位符绝不进 JSON-LD —— AI 会把 '—' 当成真实地址/电话，污染实体识别。
 */
function first(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && !isPlaceholder(v)) return v.trim();
  }
  return '';
}

/**
 * 站长平台验证 meta 标签 + Google Analytics + og:image 覆盖。
 * 后台 SEO 页保存即生效，**无需重新 build**（避免出现「填了没生效」）。
 *
 * ⚠️ 双键兼容：库里既存的是 `seo.googleVerify` 这类点号命名，
 * 早期后台页面只写下划线那套 → 两套都读，保证存量与新增都生效。
 */
export async function metaVerificationTags(): Promise<Record<string, string>> {
  const s = await getSettings();
  const out: Record<string, string> = {};

  const gsc = first(s.gsc_verification, s['seo.googleVerify'], s['seo.gscVerification']);
  if (gsc) out['google-site-verification'] = gsc;

  const bing = first(s.bing_verification, s['seo.bingVerify']);
  if (bing) out['msvalidate.01'] = bing;

  const naver = first(s.naver_verification, s['seo.naverVerify']);
  if (naver) out['naver-site-verification'] = naver;

  const baidu = first(s.baidu_verification, s['seo.baiduVerify']);
  if (baidu) out['baidu-site-verification'] = baidu;

  const sogou = first(s.sogou_verification, s['seo.sogouVerify']);
  if (sogou) out['sogou-site-verification'] = sogou;

  return out;
}

/** 后台配置的自定义 OG 图（无则空串） */
export async function siteOgImage(): Promise<string> {
  const s = await getSettings();
  return first(s.og_image, s['seo.ogImage']);
}

/** 后台配置的全站 meta 标题 / 描述 / 关键词（无则空串，交由页面级逻辑回落字典） */
export async function siteMetaDefaults(): Promise<{
  title: string;
  description: string;
  keywords: string[];
}> {
  const s = await getSettings();
  return {
    title: first(s.meta_title, s['seo.homeTitle'], s['seo.title']),
    description: first(s.meta_description, s['seo.homeDesc'], s['seo.description']),
    keywords: first(s.meta_keywords, s['seo.keywords'])
      .split(/[,，\s]+/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 20),
  };
}

/** Google Analytics 注入脚本所需的 GA ID（无则空串） */
export async function siteGaId(): Promise<string> {
  const s = await getSettings();
  return first(s.ga_id, s['seo.gaId']);
}

/** 过滤脏数据：'#' / 空 / 非 http(s) 一律剔除（禁止拿脏数据生成 sameAs） */
function cleanUrls(list: (string | undefined | null)[]): string[] {
  return list
    .filter((u): u is string => typeof u === 'string')
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));
}

/**
 * 读取后台上传的社交账号链接。
 * 存法两种都兼容：
 *  1) 逗号/换行分隔的一整串（social_links）
 *  2) 逐项键值（social_youtube / social_instagram / social_kakao / social_facebook / social_x）
 */
async function getSameAs(): Promise<string[]> {
  const s = await getSettings();
  const bulk = first(s.social_links)
    .split(/[,，\n\r]+/)
    .map((u) => u.trim())
    .filter(Boolean);
  const individual = [
    s.social_youtube,
    s.social_instagram,
    s.social_kakao,
    s.social_facebook,
    s.social_x,
    s.social_tiktok,
    s.social_linkedin,
  ];
  // cleanUrls 只认 http(s)，'#' / '—' / 相对路径全被剔除
  // kakao 走 getKakaoUrl()：后台未配置时返回空串，不会误用别家链接
  return cleanUrls([
    ...bulk,
    ...individual,
    siteConfig.youtube,
    siteConfig.instagram,
    await getKakaoUrl(),
  ]);
}

/** 公司信息：后台填的值优先，占位符一律剔除 */
async function getCompany() {
  const s = await getSettings();
  // 全部经first() 占位符过滤：siteConfig 里这些字段默认是 '—'，
  // 直接|| 回落会把占位符带进 JSON-LD，AI 会当成真实地址/电话 → 实体污染
  return {
    legalName: first(s.company_legal_name, s['seo.companyName'], s['company.name'], siteConfig.company.name),
    ceo: first(s.company_ceo, s['company.ceo'], siteConfig.company.ceo),
    address: first(s.company_address, s['company.address'], siteConfig.company.address),
    email: first(s.company_email, s['company.email'], siteConfig.company.email),
    tel: first(s.company_tel, s['company.tel'], siteConfig.company.tel),
    businessNo: first(s.company_business_no, s['company.businessNo'], siteConfig.company.businessNo),
  };
}

/** IndexNow 密钥：后台设置或环境变量，两套键名都支持 */
export async function siteIndexNowKey(): Promise<string> {
  const s = await getSettings();
  return first(s.indexnow_key, s['indexnow.key'], process.env.INDEXNOW_KEY);
}

/**
 * Organization：GEO 实体识别核心。
 * sameAs / knowsAbout / address / contactPoint / foundingDate 缺一不可——
 * 这些是 AI 做实体消歧时唯一能拿到的硬证据。
 */
export async function organizationJsonLd() {
  const base = siteConfig.url.replace(/\/$/, '');
  const [sameAs, company, facts] = await Promise.all([
    getSameAs(),
    getCompany(),
    getGeoFacts('ko', ['fact', 'claim']).catch(() => []),
  ]);

  const knowsAbout = Array.from(
    new Set([
      'golf apparel',
      'golf wear',
      'golf jacket',
      'golf pants',
      'golf knitwear',
      'golf cap',
      'golf bag',
      'golf shoes',
      '골프웨어',
      '골프 재킷',
      '고尔夫服饰',
      ...facts.map((f) => f.label),
    ]),
  );

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.nameKo,
    legalName: company.legalName || undefined,
    url: `${base}/`,
    logo: `${base}/icon.png`,
    image: `${base}/icon.png`,
    email: company.email || undefined,
    knowsAbout,
  };

  if (sameAs.length > 0) node.sameAs = sameAs;

  // 地址：有真实值才写，绝不输出 '—'（占位符会被 AI 当成真地址，污染实体）
  if (company.address) {
    node.address = {
      '@type': 'PostalAddress',
      streetAddress: company.address,
      addressCountry: 'KR',
    };
  }
  if (company.tel) node.telephone = company.tel;
  if (company.businessNo) node.vatID = company.businessNo;
  if (company.ceo) {
    node.employee = { '@type': 'Person', name: company.ceo, jobTitle: 'CEO' };
  }
  if (company.email || company.tel) {
    node.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: company.email || undefined,
      telephone: company.tel || undefined,
      areaServed: ['KR', 'CN', 'US', 'JP', 'SG'],
availableLanguage: ['ko', 'zh', 'en'],
    };
  }
  // 实体的服务范围 —— AI 判断「这家店服务谁」的关键字段
  node.areaServed = ['KR', 'CN', 'US', 'JP', 'SG', 'EU'];

  return node;
}

/** WebSite + SearchAction */
export function webSiteJsonLd(locale: Locale) {
  const base = siteConfig.url.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: siteConfig.name,
    alternateName: siteConfig.nameKo,
    url: `${base}/`,
    inLanguage: locale,
    publisher: { '@id': `${base}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/${locale}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/**
 * 完整 Product JSON-LD。
 *
 * 与旧版差异（记忆库 §8 遗留项）：
 *  - 补aggregateRating：rating / reviewCount 字段本来就在库里，之前完全没用
 *  - 补 review：真实评价内容本身就是 AI 最爱引用的社会证明
 *  - offers.priceValidUntil / itemCondition / hasMerchantReturnPolicy：提升 Offer 完整度
 *  - ⚠️ 无评价时**不输出** aggregateRating —— 宁可缺字段，不可伪造评分（否则违规）
 */
export function productJsonLd(p: {
  name: string;
  description?: string;
  image: string[];
  price: number;
  currency?: string;
  sku?: string;
  url: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: { author: string; rating: number; text: string; date?: string }[];
}) {
  const base = siteConfig.url.replace(/\/$/, '');
  const hasAgg = typeof p.rating === 'number' && p.rating > 0 && (p.reviewCount ?? 0) > 0;

  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${p.url}#product`,
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    url: p.url,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    // 制造商回指站点实体，形成 Brand ↔ Organization 的闭环关联
    manufacturer: { '@id': `${base}/#organization` },
    offers: {
      '@type': 'Offer',
      url: p.url,
      price: p.price,
      priceCurrency: p.currency ?? 'KRW',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${base}/#organization` },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        merchantReturnDays: 14,
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
      },
    },
  };

  if (hasAgg) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.rating!.toFixed(1)),
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (p.reviews?.length) {
    node.review = p.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.text,
      datePublished: r.date,
      itemReviewed: { '@id': `${p.url}#product` },
    }));
  }

  return node;
}

/** FAQPage —— AI 搜索引擎最常直接引用的结构化数据 */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  const valid = faqs
    .map((f) => ({
      question: typeof f.question === 'string' ? f.question.trim() : '',
      answer: typeof f.answer === 'string' ? f.answer.trim() : '',
    }))
    .filter((f) => f.question.length > 0 && f.answer.length > 0);
  if (valid.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer.replace(/\n+/g, ' ').trim(),
      },
    })),
  };
}

/**
 * ItemList —— 列表页/分类页结构化数据。
 * position 从 1开始，URL 必须是真实可访问的完整地址（含 locale 段）。
 */
export function itemListJsonLd(
  items: { name: string; url: string; image?: string }[],
  listName?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url,
      image: it.image,
    })),
  };
}

/** CollectionPage —— 分类/列表页容器语义 */
export function collectionPageJsonLd(opts: {
  name: string;
  description?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: { '@id': `${siteConfig.url.replace(/\/$/, '')}/#website` },
    inLanguage: 'ko',
  };
}

/** WebPage —— 给普通内容页一个明确类型（AI 抓取时更好归类） */
export function webPageJsonLd(opts: {
  name: string;
  description?: string;
  url: string;
  locale?: Locale;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: opts.locale,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    isPartOf: { '@id': `${siteConfig.url.replace(/\/$/, '')}/#website` },
  };
}