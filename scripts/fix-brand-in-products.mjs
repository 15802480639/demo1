// 一次性脚本：把产品库描述 / 摘要里残留的旧品牌名 MKGOLF 换成 J&D
// 严格限定字符串替换，不动数据量、不动价格、不删任何记录
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const env = readFileSync('.env', 'utf8');
const url = (env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m) || [])[1];
if (!url) throw new Error('DATABASE_URL not found in .env');

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const MAP = [
  [/MKGOLF\s*프리미엄\s*골프웨어/gi, 'J&D 프리미엄 골프웨어'],
  [/MKGOLF/gi, 'J&D'],
];

function fix(s) {
  if (typeof s !== 'string' || !s) return s;
  let out = s;
  for (const [re, to] of MAP) out = out.replace(re, to);
  return out;
}

const fields = ['description', 'descriptionZh', 'name', 'nameZh'];
let touched = 0;
let samples = [];

const products = await prisma.product.findMany();
for (const p of products) {
  const data = {};
  for (const f of fields) {
    if (!f in p) continue;
    const next = fix(p[f]);
    if (next !== p[f]) {
      data[f] = next;
      if (samples.length < 3) samples.push({ slug: p.slug, field: f, before: p[f].slice(-70), after: next.slice(-70) });
    }
  }
  if (Object.keys(data).length) {
    await prisma.product.update({ where: { id: p.id }, data });
    touched++;
  }
}

// 品牌表兜底扫一遍
const brands = await prisma.brand.findMany();
for (const b of brands) {
  const name = fix(b.name);
  if (name !== b.name) await prisma.brand.update({ where: { id: b.id }, data: { name } });
  const nameZh = fix(b.nameZh);
  if (nameZh !== b.nameZh) await prisma.brand.update({ where: { id: b.id }, data: { nameZh } });
}

console.log(`✓ 共扫描 ${products.length} 个商品，更新 ${touched} 个`);
console.log('品牌表当前：', (await prisma.brand.findMany({ where: { slug: 'j-d' } })).map((b) => b.name));
for (const s of samples) console.log(`\n[${s.slug}.${s.field}]\n  before: ...${s.before}\n  after : ...${s.after}`);
await prisma.$disconnect();