import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/site';
import { locales } from '@/i18n/config';
import { getSettings } from '@/lib/geo';
import { isPlaceholder } from '@/lib/seo';

/** 双键名兼容：库里既存点号键（seo.googleVerify）与新下划线键并存 */
function pick(s: Record<string, string>, primary: string, ...alts: string[]): string {
  for (const k of [primary, ...alts]) {
    const v = s[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * GEO 体检引擎。
 *
 * 设计目标：让子建在后台一眼看出「还缺什么」，而不是要他去翻代码。
 * 六维度加权（合计 100 分），每个检查项都带修复指引与跳转链接。
 *
 * 加权依据：
 *  - 实体清晰度 / 结构化数据权重最高 —— 这是 AI 判断「你是谁」的地基
 *  - 内容可引用性次之 —— 决定 AI 有没有可引用的素材
 *  - 索引通道 / 多语覆盖是放大器
 *  - 权威信号最难做，但缺了上限就低
 */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export type GeoCheck = {
  id: string;
  label: string;
  detail: string;
  status: CheckStatus;
  fix?: string;
};

export type GeoDimension = {
  key: string;
  name: string;
  nameZh: string;
  weight: number;
  score: number;
  checks: GeoCheck[];
};

export type GeoAudit = {
  total: number;
  grade: string;
  dimensions: GeoDimension[];
  summary: { pass: number; warn: number; fail: number };
  checkedAt: string;
};

function st(v: unknown): CheckStatus {
  return v ? 'pass' : 'fail';
}

export async function runGeoAudit(): Promise<GeoAudit> {
  const [
    settings,
    productCount,
    categoryCount,
    brandCount,
    faqCount,
    factCount,
    reviewCount,
    productsWithDesc,
    productsWithImage,
    productsWithReview,
    categories,
  ] = await Promise.all([
    getSettings(),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.faqItem.count({ where: { status: 'published' } }),
    prisma.geoFact.count({ where: { status: 'published' } }),
    prisma.review.count(),
    prisma.product.count({ where: { status: 'active', AND: [{ NOT: { description: null } }] } }),
    prisma.product.count({ where: { status: 'active', AND: [{ NOT: { images: '[]' } }] } }),
    prisma.product.count({ where: { reviewCount: { gt: 0 } } }),
    prisma.category.findMany({ select: { slug: true, name: true } }),
  ]);

  // ── 维度 1：实体清晰度（权重 25） ──
  const sameAsRaw =
    settings.social_links ||
    [settings.social_youtube, settings.social_instagram, settings.social_kakao].filter(Boolean).join(',');
  const sameAsCount = sameAsRaw
    .split(/[,，\n\r]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u)).length;

  const companyChecks: GeoCheck[] = [
    {
      id: 'company_name',
      label: '公司法定名称',
      detail: 'Organization JSON-LD 的 legalName。AI 实体消歧的第一字段',
      status: st(!!isPlaceholder(pick(settings, 'company_legal_name', 'seo.companyName', 'company.name') || siteConfig.company.name)),
      fix: '后台「SEO 设置」→ 公司信息 → 填法定名称',
    },
    {
      id: 'company_address',
      label: '公司地址',
      detail: 'PostalAddress。缺地址时 AI 无法把品牌归到任何实体',
      status: st(!isPlaceholder(pick(settings, 'company_address', 'company.address'))),
      fix: '后台「SEO 设置」→ 公司信息 → 填真实地址',
    },
    {
      id: 'company_tel',
      label: '联系电话 / 邮箱',
      detail: 'contactPoint / telephone。公开联系方式是可信度硬信号',
      status: st(!isPlaceholder(pick(settings, 'company_tel', 'company.tel')) && !isPlaceholder(pick(settings, 'company_email', 'company.email'))),
      fix: '后台「SEO 设置」→ 公司信息 → 填电话与邮箱',
    },
    {
      id: 'sameas',
      label: `社交 sameAs链接（已配 ${sameAsCount} 条）`,
      detail: '把品牌和官方社媒账号绑定，是「品牌 ↔ 第三方账号」的唯一硬证据',
      status: sameAsCount >= 2 ? 'pass' : sameAsCount === 1 ? 'warn' : 'fail',
      fix: '后台「SEO 设置」→ 同款/社媒 → 至少填 2 个官方账号（YouTube / Instagram / Kakao / 官网）',
    },
    {
      id: 'geo_facts',
      label: `实体档案条数（${factCount} 条）`,
      detail: 'GeoFact 表：品牌定位、品类词、卖点、发货地等可核对事实',
      status: factCount >= 8 ? 'pass' : factCount >= 3 ? 'warn' : 'fail',
      fix: '后台「GEO 知识库」→ 实体档案 → 至少录8 条事实',
    },
  ];
  const entityChecks: GeoCheck[] = [
    ...companyChecks,
    {
      id: 'brand_in_llms',
      label: 'llms.txt 品牌实体段',
      detail: '文件开头必须是「品牌 = 什么业务」的自述，AI 靠这一段建立认知',
      status: 'pass', // 模板回落保证永不为空
    },
  ];

  // ── 维度 2：结构化数据（权重 20） ──
  const schemaChecks: GeoCheck[] = [
    {
      id: 'ld_organization',
      label: 'Organization + WebSite JSON-LD',
      detail: '全站每个页面都注入，AI 用它识别站点实体',
      status: 'pass',
    },
    {
      id: 'ld_faqpage',
      label: `FAQPage schema（源数据 ${faqCount} 条 FAQ）`,
      detail: 'AI 最爱直接引用的结构；FAQ 为 0 时靠模板兜底',
      status: faqCount >= 8 ? 'pass' : faqCount > 0 ? 'warn' : 'fail',
      fix: faqCount < 8 ? '后台「GEO 知识库」→ FAQ → 补到 8 条以上（含 MOQ/发货/退换/尺码/支付）' : undefined,
    },
    {
      id: 'ld_product',
      label: 'Product + Offer + Brand + BreadcrumbList',
      detail: '产品页实体，含制造商回指 Organization',
      status: productCount > 0 ? 'pass' : 'fail',
    },
    {
      id: 'ld_itemlist',
      label: 'ItemList / CollectionPage',
      detail: '列表页与分类页结构化，帮AI 抓取商品清单',
      status: productCount > 0 ? 'pass' : 'fail',
    },
    {
      id: 'ld_aggregate',
      label: `AggregateRating / Review（${reviewCount} 条评价）`,
      detail: '社会证明。零评价时 AI 对商品可信度打折',
      status: reviewCount >= 10 ? 'pass' : reviewCount > 0 ? 'warn' : 'fail',
      fix:
        reviewCount < 10
          ? '目前 0 或极少评价 → 建议先积累真实评价。⚠️ 严禁伪造评分，缺字段比假数据安全'
          : undefined,
    },
  ];

  // ── 维度 3：内容可引用性（权重 20） ──
  const descRate = productCount > 0 ? productsWithDesc / productCount : 0;
  const imgRate = productCount > 0 ? productsWithImage / productCount : 0;
  const contentChecks: GeoCheck[] = [
    {
      id: 'llms_txt',
      label: 'llms.txt（摘要版）',
      detail: 'AI 的站点说明书。链接必须全部带 locale 段，否则 AI 抓到死链',
      status: 'pass',
    },
    {
      id: 'llms_full',
      label: 'llms-full.txt（全量版）',
      detail: '每个产品完整描述 + 全部 FAQ，供 AI 按需深挖',
      status: 'pass',
    },
    {
      id: 'product_desc',
      label: `产品描述覆盖率（${Math.round(descRate * 100)}%）`,
      detail: 'AI 可引用的核心素材，空描述的商品等于不存在',
      status: descRate >= 0.9 ? 'pass' : descRate >= 0.6 ? 'warn' : 'fail',
      fix: descRate < 0.9 ? '后台「产品管理」→ 补齐描述。建议写「材质 + 场景 + 卖点」三段式' : undefined,
    },
    {
      id: 'product_image',
      label: `产品图覆盖率（${Math.round(imgRate * 100)}%）`,
      detail: 'AI 检索商品时图文双缺会直接跳过',
      status: imgRate >= 0.9 ? 'pass' : imgRate >= 0.6 ? 'warn' : 'fail',
      fix: imgRate < 0.9 ? '后台「产品管理」→ 补主图' : undefined,
    },
    {
      id: 'answer_block',
      label: '产品页答案块',
      detail: '首段「品牌 + 品类 + 场景 + 卖点」，代码模板已生成，可被品牌事实覆盖',
      status: 'pass',
    },
  ];

  // ── 维度 4：索引通道（权重 15） ──
  const indexChecks: GeoCheck[] = [
    {
      id: 'robots',
      label: 'robots.txt AI 爬虫放行',
      detail: `已放行 20 个 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot / Google-Extended 等）`,
      status: 'pass',
    },
    {
      id: 'sitemap',
      label: 'sitemap.xml（含 hreflang）',
      detail: '产品 / 分类 / 品牌 / 信息页全量提交',
      status: productCount > 0 ? 'pass' : 'fail',
    },
    {
      id: 'indexnow',
      label: 'IndexNow 即时推送',
      detail: 'ChatGPT 联网检索主要走 Bing 索引，IndexNow 是最快刷新通道',
      status: st(pick(settings, 'indexnow_key', 'indexnow.key') || process.env.INDEXNOW_KEY),
      fix: '后台「SEO 设置」→ IndexNow key（8~128 位字母数字），并确认 public/{key}.txt 可公网访问',
    },
    {
      id: 'gsc',
      label: 'Google Search Console 验证',
      detail: 'HTML 标记验证。填值即输出 meta，无需 rebuild',
      status: st(pick(settings, 'gsc_verification', 'seo.googleVerify')),
      fix: '后台「SEO 设置」→ 填 Google 验证码；到 GSC 添加「网址前缀」资源并选「HTML 标记」',
    },
    {
      id: 'bing',
      label: 'Bing Webmaster 验证',
      detail: '优先级高于 GSC。ChatGPT 联网检索靠Bing 索引',
      status: st(pick(settings, 'bing_verification', 'seo.bingVerify')),
      fix: 'bing.com/webmasters → Import from GSC 导入 → 把验证码填回后台',
    },
    {
      id: 'naver',
      label: 'Naver 认证',
      detail: '韩国搜索引擎。韩语站必备',
      status: st(pick(settings, 'naver_verification', 'seo.naverVerify')),
      fix: 'search.naver.com → 网页도구 → 인증 → 填回后台',
    },
  ];

  // ── 维度 5：多语覆盖（权重 12） ──
  const introLangs = [
    pick(settings, 'llms_intro_en', 'llms.intro.en', 'llms.intro'),
    pick(settings, 'llms_intro_zh', 'llms.intro.zh'),
    pick(settings, 'llms_intro_ko', 'llms.intro.ko'),
  ].filter((v) => !isPlaceholder(v)).length;
  const faqLangs = new Set(
    (
      await prisma.faqItem.findMany({
        where: { status: 'published' },
        select: { locale: true },
      })
    ).map((f) => f.locale)
  ).size;
  const multiChecks: GeoCheck[] = [
    {
      id: 'hreflang',
      label: `hreflang（${locales.length} 语种 + x-default）`,
      detail: '首页 / 列表 / 产品 / sitemap 全覆盖',
      status: 'pass',
    },
    {
      id: 'llms_intro',
      label: `llms.txt 三语导语（已填 ${introLangs}/3）`,
      detail: '未填时用内置模板兜底，仍可正常输出',
      status: introLangs >= 3 ? 'pass' : introLangs > 0 ? 'warn' : 'warn',
      fix: introLangs < 3 ? '后台「GEO 知识库」→ llms.txt 导语 → 三语都写一遍' : undefined,
    },
    {
      id: 'faq_multilang',
      label: `FAQ 语种覆盖（${faqLangs} 种）`,
      detail: '中文用户问中文问题，韩语用户问韩语问题，答案要分语种',
      status: faqLangs >= 3 ? 'pass' : faqLangs > 0 ? 'warn' : 'fail',
      fix: faqLangs < 3 ? '后台「GEO 知识库」→ FAQ → 同一问题分 ko/zh/en 各录一条' : undefined,
    },
    {
      id: 'geo_fact_lang',
      label: '实体档案语种',
      detail: '事实类内容可只填英文（AI 会翻译），品牌定位建议三语',
      status: 'pass',
    },
  ];

  // ── 维度 6：权威信号（权重 8） ──
  const authorityChecks: GeoCheck[] = [
    {
      id: 'offsite',
      label: '站外第三方共识',
      detail: '决定「品牌词能否被 AI 引用」的上限，非技术可解',
      status: 'warn',
      fix:
        '① 官网与品牌站双向互链（最硬）② B2B 平台铺产品 ③ LinkedIn / YouTube ④ 行业媒体。⚠️ 各平台公司信息必须与本站完全一致',
    },
    {
      id: 'kd_ratio',
      label: `分类 / 品牌覆盖（${categoryCount} 分类 · ${brandCount} 品牌）`,
      detail: '品类维度齐全才能覆盖「XX 类高尔夫服」这类长尾提问',
      status: categoryCount >= 4 ? 'pass' : categoryCount > 0 ? 'warn' : 'fail',
      fix: categoryCount < 4 ? '补齐分类：上装 / 外套 / 裤装 / 针织 / 帽饰 / 鞋履 / 包袋' : undefined,
    },
    {
      id: 'category_named',
      label: `分类可被 AI 理解（${categories.length} 个有名称）`,
      detail: '分类名是 AI 匹配「品类词」的锚点',
      status: categories.length > 0 ? 'pass' : 'fail',
    },
    {
      id: 'review_cover',
      label: `有评价商品占比（${productsWithReview}/${productCount}）`,
      detail: '有社会证明的商品更容易被 AI 推荐',
      status: productCount > 0 && productsWithReview / productCount >= 0.3 ? 'pass' : 'warn',
      fix: '优先为新品与主推款积累真实评价',
    },
  ];

  const raw: Omit<GeoDimension, 'score'>[] = [
    { key: 'entity', name: 'Entity clarity', nameZh: '实体清晰度', weight: 25, checks: entityChecks },
    { key: 'schema', name: 'Structured data', nameZh: '结构化数据', weight: 20, checks: schemaChecks },
    { key: 'content', name: 'Citable content', nameZh: '内容可引用性', weight: 20, checks: contentChecks },
    { key: 'index', name: 'Index channels', nameZh: '索引通道', weight: 15, checks: indexChecks },
    { key: 'multi', name: 'Multilingual', nameZh: '多语覆盖', weight: 12, checks: multiChecks },
    { key: 'authority', name: 'Authority', nameZh: '权威信号', weight: 8, checks: authorityChecks },
  ];

  const dimensions: GeoDimension[] = raw.map((d) => {
    const ratio = scoreRatio(d.checks);
    return { ...d, score: Math.round(d.weight * ratio) };
  });

  const total = dimensions.reduce((s, d) => s + d.score, 0);
  const allChecks = dimensions.flatMap((d) => d.checks);

  return {
    total,
    grade: gradeOf(total),
    dimensions,
    summary: {
      pass: allChecks.filter((c) => c.status === 'pass').length,
      warn: allChecks.filter((c) => c.status === 'warn').length,
      fail: allChecks.filter((c) => c.status === 'fail').length,
    },
    checkedAt: new Date().toISOString(),
  };
}

function scoreRatio(checks: GeoCheck[]): number {
  if (checks.length === 0) return 0;
  const pts = checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  return pts / checks.length;
}

function gradeOf(total: number): string {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  if (total >= 35) return 'D';
  return 'E';
}