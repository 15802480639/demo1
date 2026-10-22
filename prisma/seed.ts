import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import scraped from './scraped-data.json';

const url = process.env.DATABASE_URL as string;
console.log('seed db url =>', url);
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const BRAND_SLUG = 'j-d';
const REVIEW_TEXTS = [
  '핏도 좋고 소재가 마음에 듭니다.',
  '배송이 빨라요. 선물하기 좋습니다.',
  '골프장에서 착용했는데 활동하기 편해요.',
  '사이즈가 정확하고 디자인이 세련됐어요.',
  '가격 대비 만족도가 높습니다.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 seeding …');

  // 管理员
  const adminHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@shop.com' },
    update: {},
    create: { email: 'admin@shop.com', name: 'Admin', passwordHash: adminHash, role: 'admin' },
  });
  console.log('✓ admin user');

  // 清空旧商品 / 评价 / SKU / 分类（保留用户、订单、优惠券）
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('✓ cleared old products & categories');

  // 分类（来自抓取数据；带一张代表图）
  const catImages: Record<string, string> = {};
  for (const p of scraped.products) {
    if (!catImages[p.categorySlug]) catImages[p.categorySlug] = p.images?.[0] ?? p.image;
  }
  const cats = scraped.categories.filter((c: { slug: string }) => catImages[c.slug]);
  for (const c of cats) {
    await prisma.category.create({
      data: { slug: c.slug, name: c.name, nameZh: c.name, imageUrl: catImages[c.slug] ?? null, sortOrder: 0 },
    });
  }
  console.log(`✓ ${cats.length} categories`);

  // 品牌：保留原有装饰品牌 + J&D（自有品牌，2026-10-20 更名）
  const brandNames = [
    'TITLEIST', 'PXG', 'GFORE', 'MARK & LONA', 'J.LINDEBERG',
    'MALBON', 'PEARLY GATES', 'ANEW', 'SOUTHCAPE', 'NIKE',
    'J&D',
  ];
  for (const n of brandNames) {
    const slug = n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.brand.upsert({ where: { slug }, update: { name: n }, create: { slug, name: n } });
  }
  console.log(`✓ ${brandNames.length} brands`);

  // 优惠券
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minSpend: 50000,
      active: true,
    },
  });
  console.log('✓ coupon WELCOME10');

  // 商品
  let count = 0;
  let featuredBudget = 12;
  for (const p of scraped.products as Array<{
    slug: string;
    name: string;
    code: string;
    price: number;
    image: string;
    images?: string[];
    gender: string;
    categorySlug: string;
  }>) {
    const isSale = p.categorySlug === 'sale';
    const tags = isSale ? ['sale'] : ['new'];
    const compareAtPrice = isSale ? Math.round((p.price * 1.15) / 100) * 100 : null;
    const color = (p.name.split('-').pop() || 'DEFAULT').trim().toUpperCase();
    const isApparel = p.categorySlug === 'padded' || p.categorySlug === 'onepiece';
    const sizes = isApparel ? ['S', 'M', 'L', 'XL'] : [color];
    const skuBase = p.slug;
    const skus = sizes.map((s) => ({
      skuCode: `${skuBase}-${s}`,
      options: JSON.stringify(isApparel ? { Color: color, Size: s } : { Color: color }),
      stock: 5 + Math.floor(Math.random() * 20),
    }));

    const featured = featuredBudget > 0 && (count % 5 === 0);
    if (featured) featuredBudget--;

    // 评价：1~3 条，评分 4~5
    const nReviews = 1 + Math.floor(Math.random() * 3);
    const ratings = Array.from({ length: nReviews }, () => 4 + Math.floor(Math.random() * 2));
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        code: p.code || null,
        gender: p.gender,
        description: `${p.name} — J&D 프리미엄 골프웨어.`,
        price: p.price,
        compareAtPrice,
        images: JSON.stringify(p.images && p.images.length ? p.images : [p.image]),
        tags: JSON.stringify(tags),
        status: 'active',
        featured,
        rating: avg,
        reviewCount: nReviews,
        category: { connect: { slug: p.categorySlug } },
        brand: { connect: { slug: BRAND_SLUG } },
        skus: { create: skus },
        reviews: {
          create: ratings.map((r, i) => ({
            id: `${p.slug}-r${i + 1}`,
            user: { connect: { email: 'admin@shop.com' } },
            rating: r,
            title: '좋아요',
            content: pick(REVIEW_TEXTS),
          })),
        },
      },
    });
    count++;
  }
  console.log(`✓ ${count} products (with SKUs & reviews)`);

  // ---------- SEO / GEO 默认值（只补缺，绝不覆盖已有设置） ----------
  const SETTING_DEFAULTS: Record<string, string> = {
    'seo.homeTitle': 'J&D — Premium Golfwear',
    'seo.homeTitle.ko': 'J&D — 프리미엄 골프웨어 쇼핑몰',
    'seo.homeTitle.zh': 'J&D — 高端高尔夫服饰商城',
    'seo.homeDesc':
      'J&D offers premium golfwear for men and women — outerwear, knitwear, headwear and bags — with worldwide shipping and authentic guarantee.',
    'seo.keywords': 'J&D, golfwear, golf apparel, premium golfwear, 골프웨어',
    'llms.intro':
      'J&D (제이앤디) is a premium golfwear brand offering men’s and women’s golf apparel, outerwear, knitwear, headwear and bags.',
    'llms.intro.ko':
      '제이앤디(J&D)는 남녀 골프웨어, 아우터, 니트, 모자, 가방을 선보이는 프리미엄 골프웨어 브랜드입니다.',
    'llms.intro.zh':
      'J&D（제이앤디）是主打男女高尔夫服饰、外套、针织、帽子与包袋的高端高尔夫服饰品牌。',
    'seo.ogImage': '/brand/jnd-og.png',
    'seo.gaId': '',
    'seo.googleVerify': '',
    'seo.bingVerify': '',
    'robots.custom': '',
    'indexnow.key': '',
  };
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    // update 留空 = 已存在的设置保持不动
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log(`✓ ${Object.keys(SETTING_DEFAULTS).length} site settings (only-if-missing)`);

  const FAQ_DEFAULTS = [
    {
      locale: 'ko',
      q: '제이앤디는 어떤 브랜드인가요?',
      a: '제이앤디(J&D)는 남녀 골프웨어, 아우터, 니트, 모자, 가방을 선보이는 프리미엄 골프웨어 브랜드입니다.',
    },
    {
      locale: 'ko',
      q: '해외 배송이 가능한가요?',
      a: '네. 국내는 물론 해외 배송을 지원하며, 주문 후 영업일 기준 1~2일 내 출고됩니다.',
    },
    {
      locale: 'ko',
      q: '정품인가요?',
      a: '제이앤디 공식 정품만 취급하며, 모든 상품은 품질 검수를 거쳐 발송됩니다.',
    },
    {
      locale: 'zh',
      q: 'J&D 是什么品牌？',
      a: 'J&D（제이앤디）是主打男女高尔夫服饰、外套、针织、帽子与包袋的高端高尔夫服饰品牌。',
    },
    {
      locale: 'zh',
      q: '支持海外配送吗？',
      a: '支持。提供国内及海外配送服务，订单将在工作日 1~2 天内发出。',
    },
    {
      locale: 'zh',
      q: '是正品吗？',
      a: '仅销售 J&D 官方正品，所有商品均经质检后发出。',
    },
    {
      locale: 'en',
      q: 'What is J&D?',
      a: 'J&D is a premium golfwear brand offering men’s and women’s golf apparel, outerwear, knitwear, headwear and bags.',
    },
    {
      locale: 'en',
      q: 'Do you ship internationally?',
      a: 'Yes. We ship both domestically and worldwide, dispatching orders within 1–2 business days.',
    },
    {
      locale: 'en',
      q: 'Are the products authentic?',
      a: 'Yes. We sell only official genuine J&D products, all quality-checked before dispatch.',
    },
  ];
  let faqAdded = 0;
  for (const [i, f] of FAQ_DEFAULTS.entries()) {
    const exists = await prisma.faqItem.findFirst({
      where: { question: f.q, locale: f.locale },
    });
    if (exists) continue;
    await prisma.faqItem.create({
      data: {
        scope: 'global',
        target: '',
        question: f.q,
        answer: f.a,
        locale: f.locale,
        order: i,
        status: 'published',
      },
    });
    faqAdded++;
  }
  console.log(`✓ ${faqAdded} FAQ items (only-if-missing)`);

  console.log('🎉 seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
