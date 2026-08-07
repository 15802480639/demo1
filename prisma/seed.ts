import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import scraped from './scraped-data.json';

const url = process.env.DATABASE_URL as string;
console.log('seed db url =>', url);
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

const BRAND_SLUG = 'mkgolf';
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

  // 品牌：保留原有装饰品牌 + MKGOLF（自有品牌）
  const brandNames = [
    'TITLEIST', 'PXG', 'GFORE', 'MARK & LONA', 'J.LINDEBERG',
    'MALBON', 'PEARLY GATES', 'ANEW', 'SOUTHCAPE', 'NIKE',
    'MKGOLF',
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
        description: `${p.name} — MKGOLF 프리미엄 골프웨어.`,
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
