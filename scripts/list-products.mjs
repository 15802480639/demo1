import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';

const url = fs.readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const prods = await prisma.product.findMany({
  include: { skus: true, category: true },
  orderBy: { createdAt: 'asc' },
});
console.log('本地商品总数:', prods.length);
for (const p of prods.slice(0, 20)) {
  let imgs = [];
  try { imgs = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); } catch {}
  console.log(`${p.slug} | W${p.price} | 分类:${p.category?.slug || '无'} | SKU:${p.skus.length} | 图:${imgs.length} | ${p.status} | ${p.name?.slice(0, 30)}`);
}
await prisma.$disconnect();
