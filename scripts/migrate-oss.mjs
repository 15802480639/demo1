/**
 * 存量图片迁移：本地 public/uploads/* → OSS
 *
 * ⚠️ 默认不执行。用户在 2026-10-23 明确决定：**本地存量图片不传 OSS**。
 *    理由：后台已删除大量产品，对应图片不再被引用，迁移纯属浪费存储与流量费。
 *    存量图继续走本地磁盘（/uploads 静态服务 + 动态读盘兜底），前台照常显示。
 *    只有**部署完成后新上传的图片**才会进 OSS。
 *
 * 如将来需要迁移（例如决定清理本地磁盘），再手动执行：
 *   cd /www/webshopp && node scripts/migrate-oss.mjs --dry   # 先看会传哪些
 *   cd /www/webshopp && node scripts/migrate-oss.mjs           # 正式迁移
 *
 * 逻辑：
 *   1) 查库，收集所有表里正在引用的 /uploads/xxx 文件名
 *   2) 只上传这些文件到 OSS（key 保持 uploads/<原文件名>）
 *   3) 把数据库里的相对路径换成 OSS 绝对地址
 *   4) 校验公网可读
 * 幂等：已迁移的（DB 里已是 OSS URL）会跳过。
 */
import OSS from 'ali-oss';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const ROLE = process.env.OSS_ROLE_NAME || 'JNDOSSImageRole';
const META = `http://100.100.100.200/latest/meta-data/ram/security-credentials/${ROLE}`;
const BUCKET = process.env.OSS_BUCKET || 'jd-oss';
const REGION = process.env.OSS_REGION || 'oss-cn-hongkong';
const PUBLIC_URL = process.env.OSS_PUBLIC_URL || `https://${BUCKET}.${REGION}.aliyuncs.com}`;
const UPLOAD_DIR = path.resolve('public', 'uploads');
const DRY = process.argv.includes('--dry');

const EXT_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
};

/** 所有存图片的表：列名 + 是否 json 数组（表名以 prisma/schema.prisma 为准） */
const IMAGE_TABLES = [
  { table: 'Product', col: 'images', type: 'json' },
  { table: 'Category', col: 'imageUrl', type: 'text' },
  { table: 'Brand', col: 'logoUrl', type: 'text' },
  { table: 'OrderItem', col: 'imageUrl', type: 'text' },
  { table: 'EventItem', col: 'imageUrl', type: 'text' },
  { table: 'HeroBanner', col: 'image', type: 'text' },
];

async function getCred() {
  const r = await fetch(META, { cache: 'no-store' });
  if (!r.ok) throw new Error(`元数据服务 ${r.status}`);
  return r.json();
}

/** 从任意形态的值里抽出 /uploads/xxx 文件名 */
function extractNames(value) {
  const out = new Set();
  const scan = (s) => {
    if (typeof s !== 'string') return;
    const m = s.match(/\/uploads\/([A-Za-z0-9._-]+)/g);
    if (m) m.forEach((x) => out.add(x.split('/').pop()));
  };
  if (typeof value === 'string') {
    // 可能是 JSON 字符串，也可能是普通 URL
    const t = value.trim();
    if (t.startsWith('[') || t.startsWith('{')) {
      try { scan(JSON.stringify(JSON.parse(t))); } catch { scan(t); }
    } else {
      scan(t);
    }
  } else if (Array.isArray(value)) {
    value.forEach(scan);
  } else if (value && typeof value === 'object') {
    scan(JSON.stringify(value));
  }
  return out;
}

async function main() {
  const cred = await getCred();
  const client = new OSS({
    region: REGION,
    bucket: BUCKET,
    accessKeyId: cred.AccessKeyId,
    accessKeySecret: cred.AccessKeySecret,
    stsToken: cred.SecurityToken,
    secure: true,
    timeout: '60s',
  });
  console.log(`Bucket: ${BUCKET} @ ${REGION}`);
  console.log(`公网前缀: ${PUBLIC_URL}`);
  console.log(`模式: ${DRY ? 'DRY（只报告不写）' : '正式迁移'}`);
  console.log('');

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // ---------- 1. 查库，收集仍在引用的图片 ----------
  const referenced = new Set();
  const tableRows = {};
  for (const t of IMAGE_TABLES) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, "${t.col}" AS v FROM "${t.table}" WHERE "${t.col}" IS NOT NULL`
      );
      tableRows[t.table] = rows;
      let n = 0;
      for (const row of rows) {
        const names = extractNames(row.v);
        names.forEach((x) => { referenced.add(x); n++; });
      }
      console.log(`  ${t.table}.${t.col}: ${rows.length} 行, 引用 ${n} 处`);
    } catch (e) {
      console.log(`  ${t.table}.${t.col}: 跳过（${String(e.message).slice(0, 60)}）`);
      tableRows[t.table] = [];
    }
  }
  console.log(`\n数据库仍在引用的图片文件: ${referenced.size} 个`);

  // ---------- 2. 扫本地文件，标出哪些要传 ----------
  let local = [];
  try {
    local = (await fs.readdir(UPLOAD_DIR)).filter((n) => /\.(jpe?g|png|webp|gif|svg)$/i.test(n));
  } catch {
    console.log(`本地目录不存在: ${UPLOAD_DIR}`);
  }
  const toUpload = local.filter((n) => referenced.has(n));
  const orphan = local.filter((n) => !referenced.has(n));
  const missing = [...referenced].filter((n) => !local.includes(n));

  console.log(`本地图片总计: ${local.length}`);
  console.log(`  ✅ 需要上传（仍被引用）: ${toUpload.length}`);
  console.log(`  ⏭️  跳过（已无引用）: ${orphan.length}`);
  if (missing.length) {
    console.log(`  ⚠️  库中引用但本地缺失: ${missing.length} → ${missing.slice(0, 5).join(', ')}`);
  }
  if (orphan.length) {
    console.log(`\n将跳过的废弃图片（前 15 个）:`);
    orphan.slice(0, 15).forEach((n) => console.log(`    - ${n}`));
  }

  // ---------- 3. 只上传仍被引用的 ----------
  const uploaded = new Map();
  let ok = 0, fail = 0, bytes = 0;
  console.log(`\n开始上传 ${toUpload.length} 个文件到 OSS...`);
  for (const name of toUpload) {
    const key = `uploads/${name}`;
    const url = `${PUBLIC_URL}/${key}`;
    try {
      const buf = await fs.readFile(path.join(UPLOAD_DIR, name));
      const ext = (name.split('.').pop() || '').toLowerCase();
      if (!DRY) {
        await client.put(key, buf, {
          mime: EXT_MIME[ext] || 'application/octet-stream',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
        });
      }
      uploaded.set(name, url);
      bytes += buf.length;
      ok++;
      if (ok % 10 === 0) console.log(`  ${ok}/${toUpload.length}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${name}: ${e.code || e.message}`);
    }
  }
  console.log(`上传完成: 成功 ${ok}, 失败 ${fail}, 合计 ${(bytes / 1024 / 1024).toFixed(2)} MB`);

  // ---------- 4. 公网可读抽检 ----------
  if (!DRY && uploaded.size) {
    console.log('\n公网可读抽检:');
    for (const [name, url] of Array.from(uploaded).slice(0, 3)) {
      try {
        const r = await fetch(url, { method: 'GET' });
        console.log(`  ${r.status} ${r.headers.get('content-type')} ${name}`);
      } catch (e) {
        console.log(`  ERR ${name}: ${e.message}`);
      }
    }
  }

  if (DRY) {
    await prisma.$disconnect();
    console.log('\n[DRY] 未修改数据库');
    return;
  }

  // ---------- 5. 改数据库 ----------
  console.log('\n改写数据库 URL:');
  for (const t of IMAGE_TABLES) {
    const rows = tableRows[t.table] || [];
    if (!rows.length) continue;
    let changed = 0;
    for (const row of rows) {
      const old = row.v;
      let next;
      if (t.type === 'json') {
        let arr;
        try { arr = typeof old === 'string' ? JSON.parse(old) : old; } catch { continue; }
        if (!Array.isArray(arr)) continue;
        next = arr.map((s) => {
          if (typeof s !== 'string' || !s.startsWith('/uploads/')) return s;
          return uploaded.get(s.split('/').pop()) || s;
        });
      } else {
        if (typeof old !== 'string' || !old.startsWith('/uploads/')) continue;
        next = uploaded.get(old.split('/').pop()) || old;
      }
      if (JSON.stringify(next) !== JSON.stringify(old)) {
        const val = t.type === 'json' ? JSON.stringify(next) : next;
        await prisma.$executeRawUnsafe(
          `UPDATE "${t.table}" SET "${t.col}" = $1 WHERE id = $2`,
          val, row.id
        );
        changed++;
      }
    }
    console.log(`  ${t.table}.${t.col}: 改写 ${changed}/${rows.length}`);
  }

  await prisma.$disconnect();
  console.log('\n✅ 迁移完成（本地旧文件保留未删，可随时回滚）');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
