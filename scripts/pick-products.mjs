import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';

const url = fs.readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const slugs = ['26padded-jacket-khaki', 'women-urbgan-swinger-down-jacket-black', '26women-short-jumpsuit-white'];
const prods = await prisma.product.findMany({
  where: { slug: { in: slugs } },
  include: { skus: true, category: true },
});
for (const p of prods) {
  console.log('===== ' + p.slug + ' =====');
  console.log('id:', p.id);
  console.log('name:', JSON.stringify(p.name).slice(0, 120));
  console.log('images:', p.images);
  console.log('specs:', (p.specs || '').slice(0, 150));
  console.log('category:', p.category?.id, p.category?.slug, JSON.stringify(p.category?.name).slice(0, 80));
  console.log('skus:', JSON.stringify(p.skus.map(s => ({ id: s.id, code: s.skuCode, price: s.price, stock: s.stock, options: s.options }))).slice(0, 400));
  console.log('fields:', Object.keys(p).join(','));
}
await prisma.$disconnect();
