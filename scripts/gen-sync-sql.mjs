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

const sqlEsc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return "'" + v.toISOString() + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
};

const cols = ['id','slug','name','nameZh','description','descriptionZh','code','gender','brandId','categoryId','price','currency','compareAtPrice','images','tags','status','rating','reviewCount','featured','createdAt','updatedAt','earnPoints','earnType','earnValue','maxPointUse','usePoints','grantCouponIds'];

let out = [];
out.push('-- 商品同步 SQL（3 个代表商品）生成于本地');
out.push('BEGIN;');
// onepiece 分类（padded 线上已存在且 id 一致）
out.push(`INSERT INTO "Category" (id, slug, name, "parentId", "sortOrder", "createdAt") VALUES ('cmuzr4fcf0001tsx418qk8vy8', 'onepiece', 'Onepiece', NULL, 0, now()) ON CONFLICT (id) DO NOTHING;`);
for (const p of prods) {
  const vals = cols.map(c => sqlEsc(p[c]));
  out.push(`INSERT INTO "Product" (${cols.map(c => '"' + c + '"').join(',')}) VALUES (${vals.join(',')}) ON CONFLICT (id) DO NOTHING;`);
  for (const s of p.skus) {
    out.push(`INSERT INTO "Sku" (id, "productId", "skuCode", price, stock, options, "createdAt") VALUES (${sqlEsc(s.id)}, ${sqlEsc(s.productId)}, ${sqlEsc(s.skuCode)}, ${sqlEsc(s.price)}, ${sqlEsc(s.stock)}, ${sqlEsc(s.options)}, now()) ON CONFLICT (id) DO NOTHING;`);
  }
}
out.push('COMMIT;');
fs.writeFileSync('scripts/sync-products.sql', out.join('\n'));
console.log('SQL 生成:', out.length, '行 →', 'scripts/sync-products.sql');
console.log(out.slice(0, 4).join('\n').slice(0, 500));
await prisma.$disconnect();
