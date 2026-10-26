import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/site';
import { locales, type Locale } from '@/i18n/config';
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

/** 三语文案对象；`lt()` 仅为少写重复键名 */
type LText = { ko: string; zh: string; en: string };
function lt(ko: string, zh: string, en: string): LText {
  return { ko, zh, en };
}

export type CheckStatus = 'pass' | 'warn' | 'fail';

/** 对外类型保持 string —— 消费方（geo-health-check）零改动 */
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

/** 内部原始检查项：文案为三语对象 */
type RawCheck = {
  id: string;
  label: LText;
  detail: LText;
  status: CheckStatus;
  fix?: LText;
};

/** 当前语言（runGeoAudit 入口设置，flat() 读取） */
let locale: Locale = 'zh';

function st(v: unknown): CheckStatus {
  return v ? 'pass' : 'fail';
}

export async function runGeoAudit(loc: Locale = 'zh'): Promise<GeoAudit> {
  locale = loc;
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
    prisma.product.count({ where: { status: 'active', AND: [{ reviewCount: { gt: 0 } }] } }),
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

  const companyChecks: RawCheck[] = [
    {
      id: 'company_name',
      label: lt('회사 법정명', '公司法定名称', 'Legal company name'),
      detail: lt(
        'Organization JSON-LD의 legalName. AI 엔티티 식별의 첫 번째 필드',
        'Organization JSON-LD 的 legalName。AI 实体消歧的第一字段',
        'legalName of Organization JSON-LD — the first field for AI entity disambiguation'
      ),
      status: st(!!isPlaceholder(pick(settings, 'company_legal_name', 'seo.companyName', 'company.name') || siteConfig.company.name)),
      fix: lt(
        '백오피스 「SEO 설정」 → 회사 정보 → 법정명 입력',
        '后台「SEO 设置」→ 公司信息 → 填法定名称',
        'Admin → SEO Settings → Company info → legal name'
      ),
    },
    {
      id: 'company_address',
      label: lt('회사 주소', '公司地址', 'Company address'),
      detail: lt(
        'PostalAddress. 주소가 없으면 AI가 브랜드를 어떤 엔티티에도 귀속시킬 수 없습니다',
        'PostalAddress。缺地址时 AI 无法把品牌归到任何实体',
        'PostalAddress — without it AI cannot anchor the brand to any entity'
      ),
      status: st(!isPlaceholder(pick(settings, 'company_address', 'company.address'))),
      fix: lt(
        '백오피스 「SEO 설정」 → 회사 정보 → 실제 주소 입력',
        '后台「SEO 设置」→ 公司信息 → 填真实地址',
        'Admin → SEO Settings → Company info → real address'
      ),
    },
    {
      id: 'company_tel',
      label: lt('연락 전화 / 이메일', '联系电话 / 邮箱', 'Contact phone / email'),
      detail: lt(
        'contactPoint / telephone. 공개된 연락처는 신뢰도의 핵심 신호',
        'contactPoint / telephone。公开联系方式是可信度硬信号',
        'contactPoint / telephone — public contact info is a hard trust signal'
      ),
      status: st(!isPlaceholder(pick(settings, 'company_tel', 'company.tel')) && !isPlaceholder(pick(settings, 'company_email', 'company.email'))),
      fix: lt(
        '백오피스 「SEO 설정」 → 회사 정보 → 전화와 이메일 입력',
        '后台「SEO 设置」→ 公司信息 → 填电话与邮箱',
        'Admin → SEO Settings → Company info → phone and email'
      ),
    },
    {
      id: 'sameas',
      label: lt(
        `소셜 sameAs 링크(${sameAsCount}개 설정됨)`,
        `社交 sameAs链接（已配 ${sameAsCount} 条）`,
        `Social sameAs links (${sameAsCount} configured)`
      ),
      detail: lt(
        '브랜드와 공식 소셜 계정을 묶는 「브랜드 ↔ 서드파티 계정」의 유일한 핵심 근거',
        '把品牌和官方社媒账号绑定，是「品牌 ↔ 第三方账号」的唯一硬证据',
        'Tying the brand to official social accounts — the only hard evidence for brand ↔ third-party accounts'
      ),
      status: sameAsCount >= 2 ? 'pass' : sameAsCount === 1 ? 'warn' : 'fail',
      fix: lt(
        '백오피스 「SEO 설정」 → sameAs/소셜 → 공식 계정 2개 이상 입력(YouTube / Instagram / Kakao / 홈페이지)',
        '后台「SEO 设置」→ 同款/社媒 → 至少填 2 个官方账号（YouTube / Instagram / Kakao / 官网）',
        'Admin → SEO Settings → sameAs/social → at least 2 official accounts (YouTube / Instagram / Kakao / site)'
      ),
    },
    {
      id: 'geo_facts',
      label: lt(
        `엔티티 프로필 ${factCount}건`,
        `实体档案条数（${factCount} 条）`,
        `Entity profile entries (${factCount})`
      ),
      detail: lt(
        'GeoFact 테이블: 브랜드 포지셔닝, 카테고리어, 셀링 포인트, 발송지 등 검증 가능한 사실',
        'GeoFact 表：品牌定位、品类词、卖点、发货地等可核对事实',
        'GeoFact table — verifiable facts: positioning, category terms, selling points, ship-from'
      ),
      status: factCount >= 8 ? 'pass' : factCount >= 3 ? 'warn' : 'fail',
      fix: lt(
        '백오피스 「GEO 지식베이스」 → 엔티티 프로필 → 최소 8건录入',
        '后台「GEO 知识库」→ 实体档案 → 至少录 8 条事实',
        'Admin → GEO knowledge base → Entity profiles → at least 8 entries'
      ),
    },
  ];
  const entityChecks: RawCheck[] = [
    ...companyChecks,
    {
      id: 'brand_in_llms',
      label: lt('llms.txt 브랜드 엔티티 단락', 'llms.txt 品牌实体段', 'llms.txt brand entity block'),
      detail: lt(
        '파일 첫머리는 「브랜드 = 어떤 비즈니스」의 자술문이어야 하며, AI가 이 단락으로 인식을 형성합니다',
        '文件开头必须是「品牌 = 什么业务」的自述，AI 靠这一段建立认知',
        'The file must open with a "brand = what business" self-description — AI builds its picture from this block'
      ),
      status: 'pass', // 模板回落保证永不为空
    },
  ];

  // ── 维度 2：结构化数据（权重 20） ──
  const schemaChecks: RawCheck[] = [
    {
      id: 'ld_organization',
      label: lt('Organization + WebSite JSON-LD', 'Organization + WebSite JSON-LD', 'Organization + WebSite JSON-LD'),
      detail: lt(
        '전 페이지에 주입되며, AI가 이를 통해 사이트 엔티티를 식별합니다',
        '全站每个页面都注入，AI 用它识别站点实体',
        'Injected on every page — AI uses it to identify the site entity'
      ),
      status: 'pass',
    },
    {
      id: 'ld_faqpage',
      label: lt(
        `FAQPage schema(원본 ${faqCount}개 FAQ)`,
        `FAQPage schema（源数据 ${faqCount} 条 FAQ）`,
        `FAQPage schema (${faqCount} source FAQs)`
      ),
      detail: lt(
        'AI가 가장 직접 인용하기 좋아하는 구조. FAQ가 0이면 템플릿으로 fallback합니다',
        'AI 最爱直接引用的结构；FAQ 为 0 时靠模板兜底',
        'The structure AI loves to cite directly; falls back to templates when FAQ = 0'
      ),
      status: faqCount >= 8 ? 'pass' : faqCount > 0 ? 'warn' : 'fail',
      fix: faqCount < 8 ? lt(
        '백오피스 「GEO 지식베이스」 → FAQ → 8개 이상 보강(MOQ/발송/교환반품/사이즈/결제 포함)',
        '后台「GEO 知识库」→ FAQ → 补到 8 条以上（含 MOQ/发货/退换/尺码/支付）',
        'Admin → GEO knowledge base → FAQ → fill to 8+ (incl. MOQ/shipping/returns/sizing/payment)'
      ) : undefined,
    },
    {
      id: 'ld_product',
      label: lt('Product + Offer + Brand + BreadcrumbList', 'Product + Offer + Brand + BreadcrumbList', 'Product + Offer + Brand + BreadcrumbList'),
      detail: lt(
        '제품 페이지 엔티티. 제조사가 Organization을 back-reference합니다',
        '产品页实体，含制造商回指 Organization',
        'Product-page entity with manufacturer back-reference to Organization'
      ),
      status: productCount > 0 ? 'pass' : 'fail',
    },
    {
      id: 'ld_itemlist',
      label: lt('ItemList / CollectionPage', 'ItemList / CollectionPage', 'ItemList / CollectionPage'),
      detail: lt(
        '목록·카테고리 페이지 구조화로 AI의 상품 목록 수집을 돕습니다',
        '列表页与分类页结构化，帮 AI 抓取商品清单',
        'Structured list/category pages help AI harvest the product list'
      ),
      status: productCount > 0 ? 'pass' : 'fail',
    },
    {
      id: 'ld_aggregate',
      label: lt(
        `AggregateRating / Review(${reviewCount}개 평가)`,
        `AggregateRating / Review（${reviewCount} 条评价）`,
        `AggregateRating / Review (${reviewCount} reviews)`
      ),
      detail: lt(
        '사회 증명. 평가가 0이면 AI가 상품 신뢰도를 할인합니다',
        '社会证明。零评价时 AI 对商品可信度打折',
        'Social proof — with zero reviews AI discounts product credibility'
      ),
      status: reviewCount >= 10 ? 'pass' : reviewCount > 0 ? 'warn' : 'fail',
      fix:
        reviewCount < 10
          ? lt(
              '현재 평가가 0 또는 극소수 → 실제 평가를 먼저 쌓으세요. ⚠️ 평점 위조는 절대 금지 — 필드가 없는 것이 가짜 데이터보다 안전합니다',
              '目前 0 或极少评价 → 建议先积累真实评价。⚠️ 严禁伪造评分，缺字段比假数据安全',
              '0 or very few reviews — build real reviews first. ⚠️ Never fake ratings: a missing field beats fake data'
            )
          : undefined,
    },
  ];

  // ── 维度 3：内容可引用性（权重 20） ──
  const descRate = productCount > 0 ? productsWithDesc / productCount : 0;
  const imgRate = productCount > 0 ? productsWithImage / productCount : 0;
  const contentChecks: RawCheck[] = [
    {
      id: 'llms_txt',
      label: lt('llms.txt(요약)', 'llms.txt（摘要版）', 'llms.txt (summary)'),
      detail: lt(
        'AI의 사이트 설명서. 링크는 반드시 locale 세그먼트를 포함해야 합니다, 그렇지 않으면 AI가 죽은 링크를 잡습니다',
        'AI 的站点说明书。链接必须全部带 locale 段，否则 AI 抓到死链',
        'The AI site manual — every link must carry the locale segment, or AI harvests dead links'
      ),
      status: 'pass',
    },
    {
      id: 'llms_full',
      label: lt('llms-full.txt(전체)', 'llms-full.txt（全量版）', 'llms-full.txt (full)'),
      detail: lt(
        '각 제품의 전체 설명 + 모든 FAQ. AI가 필요 시 깊게 파고들 수 있습니다',
        '每个产品完整描述 + 全部 FAQ，供 AI 按需深挖',
        'Full description of every product + all FAQs for AI to dig into on demand'
      ),
      status: 'pass',
    },
    {
      id: 'product_desc',
      label: lt(
        `제품 설명覆盖率(${Math.round(descRate * 100)}%)`,
        `产品描述覆盖率（${Math.round(descRate * 100)}%）`,
        `Product description coverage (${Math.round(descRate * 100)}%)`
      ),
      detail: lt(
        'AI가 인용할 수 있는 핵심 소재. 설명이 빈 상품은 존재하지 않는 것과 같습니다',
        'AI 可引用的核心素材，空描述的商品等于不存在',
        'Core material AI can cite — a product with no description may as well not exist'
      ),
      status: descRate >= 0.9 ? 'pass' : descRate >= 0.6 ? 'warn' : 'fail',
      fix: descRate < 0.9 ? lt(
        '백오피스 「제품 관리」 → 설명 보강. 「소재 + 장면 + 셀링 포인트」 3단 구성 권장',
        '后台「产品管理」→ 补齐描述。建议写「材质 + 场景 + 卖点」三段式',
        'Admin → Products → fill descriptions. Recommended: "material + scenario + selling point"'
      ) : undefined,
    },
    {
      id: 'product_image',
      label: lt(
        `제품 이미지覆盖率(${Math.round(imgRate * 100)}%)`,
        `产品图覆盖率（${Math.round(imgRate * 100)}%）`,
        `Product image coverage (${Math.round(imgRate * 100)}%)`
      ),
      detail: lt(
        'AI가 상품을 검색할 때 이미지와 설명이 모두 없으면 그냥 지나칩니다',
        'AI 检索商品时图文双缺会直接跳过',
        'AI skips products missing both images and descriptions'
      ),
      status: imgRate >= 0.9 ? 'pass' : imgRate >= 0.6 ? 'warn' : 'fail',
      fix: imgRate < 0.9 ? lt(
        '백오피스 「제품 관리」 → 대표 이미지 보강',
        '后台「产品管理」→ 补主图',
        'Admin → Products → add main images'
      ) : undefined,
    },
    {
      id: 'answer_block',
      label: lt('제품 페이지 답변 블록', '产品页答案块', 'Product page answer block'),
      detail: lt(
        '첫 단락 「브랜드 + 카테고리 + 장면 + 셀링 포인트」. 코드 템플릿이 생성했으며 브랜드 사실로 덮어쓸 수 있습니다',
        '首段「品牌 + 品类 + 场景 + 卖点」，代码模板已生成，可被品牌事实覆盖',
        'Opening paragraph "brand + category + scenario + selling point" — template-generated, overridable by brand facts'
      ),
      status: 'pass',
    },
  ];

  // ── 维度 4：索引通道（权重 15） ──
  const indexChecks: RawCheck[] = [
    {
      id: 'robots',
      label: lt('robots.txt AI 크롤러 허용', 'robots.txt AI 爬虫放行', 'robots.txt AI crawlers allowed'),
      detail: lt(
        '20개 AI 크롤러를 이미 허용했습니다(GPTBot / ClaudeBot / PerplexityBot / Google-Extended 등)',
        '已放行 20 个 AI 爬虫（GPTBot / ClaudeBot / PerplexityBot / Google-Extended 等）',
        '20 AI crawlers already allowed (GPTBot / ClaudeBot / PerplexityBot / Google-Extended, etc.)'
      ),
      status: 'pass',
    },
    {
      id: 'sitemap',
      label: lt('sitemap.xml(hreflang 포함)', 'sitemap.xml（含 hreflang）', 'sitemap.xml (with hreflang)'),
      detail: lt(
        '제품 / 카테고리 / 브랜드 / 정보 페이지 전량 제출',
        '产品 / 分类 / 品牌 / 信息页全量提交',
        'All products / categories / brands / info pages submitted'
      ),
      status: productCount > 0 ? 'pass' : 'fail',
    },
    {
      id: 'indexnow',
      label: lt('IndexNow 즉시 푸시', 'IndexNow 即时推送', 'IndexNow instant push'),
      detail: lt(
        'ChatGPT联网 검색은 주로 Bing 인덱스를 경유하며, IndexNow가 가장 빠른 갱신通道입니다',
        'ChatGPT 联网检索主要走 Bing 索引，IndexNow 是最快刷新通道',
        'ChatGPT live search mainly rides the Bing index — IndexNow is the fastest refresh channel'
      ),
      status: st(pick(settings, 'indexnow_key', 'indexnow.key') || process.env.INDEXNOW_KEY),
      fix: lt(
        '백오피스 「SEO 설정」 → IndexNow key(8~128位 영숫자), 그리고 public/{key}.txt 가 공공망 접근 가능한지 확인',
        '后台「SEO 设置」→ IndexNow key（8~128 位字母数字），并确认 public/{key}.txt 可公网访问',
        'Admin → SEO Settings → IndexNow key (8–128 alphanumeric); confirm public/{key}.txt is publicly readable'
      ),
    },
    {
      id: 'gsc',
      label: lt('Google Search Console 인증', 'Google Search Console 验证', 'Google Search Console verification'),
      detail: lt(
        'HTML 태그 인증. 값을 채우면 meta로 출력되며 rebuild가 필요 없습니다',
        'HTML 标记验证。填值即输出 meta，无需 rebuild',
        'HTML-tag verification — filling the value outputs the meta, no rebuild needed'
      ),
      status: st(pick(settings, 'gsc_verification', 'seo.googleVerify')),
      fix: lt(
        '백오피스 「SEO 설정」 → Google 인증코드 입력; GSC에서 「URL 프리픽스」 리소스를 추가하고 「HTML 태그」 선택',
        '后台「SEO 设置」→ 填 Google 验证码；到 GSC 添加「网址前缀」资源并选「HTML 标记」',
        'Admin → SEO Settings → Google verification code; add a "URL prefix" property in GSC and pick "HTML tag"'
      ),
    },
    {
      id: 'bing',
      label: lt('Bing Webmaster 인증', 'Bing Webmaster 验证', 'Bing Webmaster verification'),
      detail: lt(
        'GSC보다 우선순위가 높습니다. ChatGPT联网 검색은 Bing 인덱스에 의존합니다',
        '优先级高于 GSC。ChatGPT 联网检索靠 Bing 索引',
        'Higher priority than GSC — ChatGPT live search relies on the Bing index'
      ),
      status: st(pick(settings, 'bing_verification', 'seo.bingVerify')),
      fix: lt(
        'bing.com/webmasters → Import from GSC로 가져오기 → 인증코드를 백오피스에 입력',
        'bing.com/webmasters → Import from GSC 导入 → 把验证码填回后台',
        'bing.com/webmasters → Import from GSC → paste the code back into admin'
      ),
    },
    {
      id: 'naver',
      label: lt('Naver 인증', 'Naver 认证', 'Naver verification'),
      detail: lt(
        '한국 검색엔진. 한국어 사이트에는 필수입니다',
        '韩国搜索引擎。韩语站必备',
        'Korean search engine — mandatory for a Korean-language site'
      ),
      status: st(pick(settings, 'naver_verification', 'seo.naverVerify')),
      fix: lt(
        'search.naver.com → 웹도구 → 인증 → 백오피스에 입력',
        'search.naver.com → 网页工具 → 认证 → 填回后台',
        'search.naver.com → web tools → verify → paste back into admin'
      ),
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
  const multiChecks: RawCheck[] = [
    {
      id: 'hreflang',
      label: lt(
        `hreflang(${locales.length}개 언어 + x-default)`,
        `hreflang（${locales.length} 语种 + x-default）`,
        `hreflang (${locales.length} languages + x-default)`
      ),
      detail: lt(
        '홈 / 목록 / 제품 / sitemap 전체 커버',
        '首页 / 列表 / 产品 / sitemap 全覆盖',
        'Full coverage on home / list / product / sitemap'
      ),
      status: 'pass',
    },
    {
      id: 'llms_intro',
      label: lt(
        `llms.txt 3어导语(${introLangs}/3 입력됨)`,
        `llms.txt 三语导语（已填 ${introLangs}/3）`,
        `llms.txt intros in 3 languages (${introLangs}/3 filled)`
      ),
      detail: lt(
        '미입력 시 내장 템플릿으로 fallback하며, 그래도 정상 출력됩니다',
        '未填时用内置模板兜底，仍可正常输出',
        'Falls back to the built-in template when empty — still outputs normally'
      ),
      status: introLangs >= 3 ? 'pass' : introLangs > 0 ? 'warn' : 'warn',
      fix: introLangs < 3 ? lt(
        '백오피스 「GEO 지식베이스」 → llms.txt 导语 → 3개 언어 모두 작성',
        '后台「GEO 知识库」→ llms.txt 导语 → 三语都写一遍',
        'Admin → GEO knowledge base → llms.txt intro → write all three languages'
      ) : undefined,
    },
    {
      id: 'faq_multilang',
      label: lt(
        `FAQ 언어 커버(${faqLangs}종)`,
        `FAQ 语种覆盖（${faqLangs} 种）`,
        `FAQ language coverage (${faqLangs})`
      ),
      detail: lt(
        '중문 사용자는 중문으로, 한국어 사용자는 한국어로 묻습니다. 답변도 언어를 나눠야 합니다',
        '中文用户问中文问题，韩语用户问韩语问题，答案要分语种',
        'Chinese users ask in Chinese, Korean users in Korean — answers must be split by language'
      ),
      status: faqLangs >= 3 ? 'pass' : faqLangs > 0 ? 'warn' : 'fail',
      fix: faqLangs < 3 ? lt(
        '백오피스 「GEO 지식베이스」 → FAQ → 같은 질문을 ko/zh/en 각각 1건씩录入',
        '后台「GEO 知识库」→ FAQ → 同一问题分 ko/zh/en 各录一条',
        'Admin → GEO knowledge base → FAQ → record the same question once per ko/zh/en'
      ) : undefined,
    },
    {
      id: 'geo_fact_lang',
      label: lt('엔티티 프로필 언어', '实体档案语种', 'Entity profile languages'),
      detail: lt(
        '사실类 콘텐츠는 영어만 채워도 됩니다(AI가 번역합니다). 브랜드 포지셔닝은 3개 언어 권장',
        '事实类内容可只填英文（AI 会翻译），品牌定位建议三语',
        'Factual content may be English-only (AI translates); brand positioning should be trilingual'
      ),
      status: 'pass',
    },
  ];

  // ── 维度 6：权威信号（权重 8） ──
  const authorityChecks: RawCheck[] = [
    {
      id: 'offsite',
      label: lt('사이트 외부 제3자 컨센서스', '站外第三方共识', 'Off-site third-party consensus'),
      detail: lt(
        '「브랜드어가 AI에 인용될 수 있는지」의 상한을 결정합니다. 기술로는 풀 수 없습니다',
        '决定「品牌词能否被 AI 引用」的上限，非技术可解',
        'Sets the ceiling on whether the brand term can be cited by AI — not a technical fix'
      ),
      status: 'warn',
      fix: lt(
        '① 공식 사이트와 브랜드 사이트 양방향 링크(最硬) ② B2B 플랫폼에 제품 등록 ③ LinkedIn / YouTube ④ 업계 미디어. ⚠️ 각 플랫폼의 회사 정보는 본 사이트와 완전히 일치해야 합니다',
        '① 官网与品牌站双向互链（最硬）② B2B 平台铺产品 ③ LinkedIn / YouTube ④ 行业媒体。⚠️ 各平台公司信息必须与本站完全一致',
        '① Two-way links between site and brand site (hardest) ② list products on B2B platforms ③ LinkedIn / YouTube ④ trade media. ⚠️ Company info on each platform must match this site exactly'
      ),
    },
    {
      id: 'kd_ratio',
      label: lt(
        `카테고리 / 브랜드 커버(${categoryCount} 카테고리 · ${brandCount} 브랜드)`,
        `分类 / 品牌覆盖（${categoryCount} 分类 · ${brandCount} 品牌）`,
        `Category / brand coverage (${categoryCount} categories · ${brandCount} brands)`
      ),
      detail: lt(
        '카테고리 차원이 갖춰져야 「XX类 골프웨어」 같은 롱테일 질문을 커버할 수 있습니다',
        '品类维度齐全才能覆盖「XX 类高尔夫服」这类长尾提问',
        'Complete category dimensions are needed to cover long-tail asks like "XX-type golf wear"'
      ),
      status: categoryCount >= 4 ? 'pass' : categoryCount > 0 ? 'warn' : 'fail',
      fix: categoryCount < 4 ? lt(
        '카테고리 보강: 상의 / 아우터 / 하의 / 니트 / 모자 / 신발 / 가방',
        '补齐分类：上装 / 外套 / 裤装 / 针织 / 帽饰 / 鞋履 / 包袋',
        'Fill categories: tops / outerwear / bottoms / knits / headwear / footwear / bags'
      ) : undefined,
    },
    {
      id: 'category_named',
      label: lt(
        `AI가 이해할 수 있는 카테고리(${categories.length}개에 이름 있음)`,
        `分类可被 AI 理解（${categories.length} 个有名称）`,
        `AI-readable categories (${categories.length} named)`
      ),
      detail: lt(
        '카테고리명은 AI가 「카테고리어」를 매칭하는 닻입니다',
        '分类名是 AI 匹配「品类词」的锚点',
        'Category names are the anchor for AI matching category terms'
      ),
      status: categories.length > 0 ? 'pass' : 'fail',
    },
    {
      id: 'review_cover',
      label: lt(
        `평가 보유 상품 비중(${productsWithReview}/${productCount})`,
        `有评价商品占比（${productsWithReview}/${productCount}）`,
        `Share of products with reviews (${productsWithReview}/${productCount})`
      ),
      detail: lt(
        '사회 증명이 있는 상품이 AI에게 더 추천되기 쉽습니다',
        '有社会证明的商品更容易被 AI 推荐',
        'Products with social proof are more likely to be recommended by AI'
      ),
      status: productCount > 0 && productsWithReview / productCount >= 0.3 ? 'pass' : 'warn',
      fix: lt(
        '신제품과 주력 제품의 실제 평가를 먼저 쌓으세요',
        '优先为新品与主推款积累真实评价',
        'Prioritize building real reviews for new and hero products'
      ),
    },
  ];

  const raw: { key: string; name: string; nameZh: LText; weight: number; checks: RawCheck[] }[] = [
    { key: 'entity', name: 'Entity clarity', nameZh: lt('엔티티 명확도', '实体清晰度', 'Entity clarity'), weight: 25, checks: entityChecks },
    { key: 'schema', name: 'Structured data', nameZh: lt('구조화된 데이터', '结构化数据', 'Structured data'), weight: 20, checks: schemaChecks },
    { key: 'content', name: 'Citable content', nameZh: lt('콘텐츠 인용 가능성', '内容可引用性', 'Citable content'), weight: 20, checks: contentChecks },
    { key: 'index', name: 'Index channels', nameZh: lt('인덱스 채널', '索引通道', 'Index channels'), weight: 15, checks: indexChecks },
    { key: 'multi', name: 'Multilingual', nameZh: lt('다언어 커버', '多语覆盖', 'Multilingual'), weight: 12, checks: multiChecks },
    { key: 'authority', name: 'Authority', nameZh: lt('권위 신호', '权威信号', 'Authority'), weight: 8, checks: authorityChecks },
  ];

  // 拍平：三语对象 → 当前语言字符串（消费方零改动）
  const dimensions: GeoDimension[] = raw.map((d) => {
    const ratio = scoreRatio(d.checks);
    return {
      key: d.key,
      name: d.name,
      nameZh: d.nameZh[locale],
      weight: d.weight,
      score: Math.round(d.weight * ratio),
      checks: d.checks.map((c) => ({
        id: c.id,
        label: c.label[locale],
        detail: c.detail[locale],
        status: c.status,
        fix: c.fix ? c.fix[locale] : undefined,
      })),
    };
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

function scoreRatio(checks: RawCheck[]): number {
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
