/**
 * 存量图片迁移：本地 public/uploads/* → OSS
 * 用法（服务器上）：
 *   cd /www/webshopp && node scripts/migrate-oss.mjs
 *
 * 逻辑：
 *   1) 扫描 public/uploads 下所有图片
 *   2) 逐个上传到 OSS（同名，保持 key 稳定：uploads/<原文件名>）
 *   3) 把数据库里 /uploads/xxx 形式的 URL 换成 OSS 绝对地址
 *   4) 校验 OSS 上文件可公网访问
 * 幂等：已迁移过的（DB 里已是 OSS URL）会跳过。
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
const PUBLIC_URL = process.env.OSS_PUBLIC_URL || `https://${BUCKET}.${REGION}.aliyuncs.com`;
const UPLOAD_DIR = path.resolve('public', 'uploads');
const DRY = process.argv.includes('--dry');

const EXT_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
};

async function getCred() {
  const r = await fetch(META, { cache: 'no-store' });
  if (!r.ok) throw new Error(`元数据服务 ${r.status}`);
  return r.json();
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

  // 1) 扫文件
  let names = [];
  try {
    names = await fs.readdir(UPLOAD_DIR);
  } catch (e) {
    console.log('上传目录不存在:', UPLOAD_DIR, e.message);
    return;
  }
  const files = names.filter((n) => /\.(jpe?g|png|webp|gif|svg)$/i.test(n));
  console.log(`本地图片 ${files.length} 个\n`);

  // 2) 上传
  const uploaded = new Map(); // 原名 -> OSS URL
  let ok = 0, fail = 0;
  for (const name of files) {
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
      ok++;
      if (ok % 10 === 0) console.log(`  已上传 ${ok}/${files.length}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${name}: ${e.code || e.message}`);
    }
  }
  console.log(`\n上传完成: 成功 ${ok}, 失败 ${fail}`);

  // 3) 公网可读性抽检
  console.log('\n公网可读抽检:');
  for (const [name, url] of Array.from(uploaded).slice(0, 3)) {
    try {
      const r = await fetch(url, { method: 'GET' });
      console.log(`  ${r.status} ${r.headers.get('content-type')} ${name}`);
    } catch (e) {
      console.log(`  ERR ${name}: ${e.message}`);
    }
  }

  if (DRY) {
    console.log('\n[DRY] 未修改数据库');
    return;
  }

  // 4) 改数据库
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const tables = [
    { table: 'Product', col: 'images', type: 'json' },
    { table: 'Category', col: 'imageUrl', type: 'text' },
    { table: 'Brand', col: 'logoUrl', type: 'text' },
    { table: 'EventItem', col: 'imageUrl', type: 'text' },
    { table: 'HeroBanner', col: 'image', type: 'text' },
    { table: 'Banner', col: 'image', type: 'text' },
  ];

  for (const t of tables) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, "${t.col}" AS v FROM "${t.table}" WHERE "${t.col}"::text LIKE '%/uploads/%'`
      );
      if (!rows.length) { console.log(`  ${t.table}.${t.col}: 无需迁移`); continue; }
      let changed = 0;
      for (const row of rows) {
        const old = row.v;
        let next;
        if (t.type === 'json') {
          const arr = typeof old === 'string' ? JSON.parse(old) : old;
          if (!Array.isArray(arr)) continue;
          next = arr.map((s) => {
            if (typeof s !== 'string' || !s.startsWith('/uploads/')) return s;
            const base = s.split('/').pop();
            const mapped = uploaded.get(base);
            return mapped || s;
          });
        } else {
          if (typeof old !== 'string' || !old.startsWith('/uploads/')) continue;
          const base = old.split('/').pop();
          next = uploaded.get(base) || old;
        }
        if (next !== old && JSON.stringify(next) !== JSON.stringify(old)) {
          const val = t.type === 'json' ? JSON.stringify(next) : next;
          await prisma.$executeRawUnsafe(
            `UPDATE "${t.table}" SET "${t.col}" = $1 WHERE id = $2`,
            val, row.id
          );
          changed++;
        }
      }
      console.log(`  ${t.table}.${t.col}: 改写 ${changed}/${rows.length}`);
    } catch (e) {
      console.log(`  ${t.table}.${t.col}: 跳过（${String(e.message).slice(0, 80)}）`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ 迁移完成');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
