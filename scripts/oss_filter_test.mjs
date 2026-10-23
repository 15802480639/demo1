/**
 * 本地验证：迁移脚本的「只传仍被引用的图片」筛选逻辑
 * 用本地 Docker PG，不连 OSS（只验证筛选与统计，DRY 模式）
 */
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const IMAGE_TABLES = [
  { table: 'Product', col: 'images', type: 'json' },
  { table: 'Category', col: 'imageUrl', type: 'text' },
  { table: 'Brand', col: 'logoUrl', type: 'text' },
  { table: 'OrderItem', col: 'imageUrl', type: 'text' },
  { table: 'EventItem', col: 'imageUrl', type: 'text' },
  { table: 'HeroBanner', col: 'image', type: 'text' },
];

function extractNames(value) {
  const out = new Set();
  const scan = (s) => {
    if (typeof s !== 'string') return;
    const m = s.match(/\/uploads\/([A-Za-z0-9._-]+)/g);
    if (m) m.forEach((x) => out.add(x.split('/').pop()));
  };
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.startsWith('[') || t.startsWith('{')) {
      try { scan(JSON.stringify(JSON.parse(t))); } catch { scan(t); }
    } else scan(t);
  } else if (Array.isArray(value)) value.forEach(scan);
  else if (value && typeof value === 'object') scan(JSON.stringify(value));
  return out;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/webshopp' }),
});

const referenced = new Set();
for (const t of IMAGE_TABLES) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, "${t.col}" AS v FROM "${t.table}" WHERE "${t.col}" IS NOT NULL`
    );
    let n = 0;
    for (const r of rows) { const x = extractNames(r.v); x.forEach((k) => { referenced.add(k); n++; }); }
    console.log(`  ${t.table}.${t.col}: ${rows.length} 行, 引用 ${n} 处`);
  } catch (e) {
    console.log(`  ${t.table}.${t.col}: 跳过（${String(e.message).slice(0, 60)}）`);
  }
}
console.log(`\n仍在引用的图片: ${referenced.size} 个`);

const UPLOAD_DIR = path.resolve('public', 'uploads');
const local = (await fs.readdir(UPLOAD_DIR)).filter((n) => /\.(jpe?g|png|webp|gif|svg)$/i.test(n));
const toUpload = local.filter((n) => referenced.has(n));
const orphan = local.filter((n) => !referenced.has(n));
const missing = [...referenced].filter((n) => !local.includes(n));

console.log(`本地图片: ${local.length}`);
console.log(`  ✅ 需上传: ${toUpload.length}`);
console.log(`  ⏭️  跳过废弃: ${orphan.length}`);
console.log(`  ⚠️  库引用但本地缺失: ${missing.length}`);
if (orphan.length) console.log('  废弃示例:', orphan.slice(0, 8).join(', '));

let bytes = 0;
for (const n of toUpload) bytes += (await fs.stat(path.join(UPLOAD_DIR, n))).size;
console.log(`\n需上传体积: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
await prisma.$disconnect();
