/**
 * 一次性修复脚本：把已应用的迁移记录改名，使其与目录名的字典序一致。
 *
 * 背景：prisma/migrations 下
 *   20261008161206_add_seo_geo_tables   （ALTER TABLE "HeroBanner"）
 *   20261009000000_init                 （CREATE TABLE "HeroBanner"）
 * 目录名排序时 ALTER 排在建表之前 → shadow 库从零重放报relation "HeroBanner" does not exist，
 * 将来新环境执行 prisma migrate deploy 也会同样失败。
 *
 * 做法：把迁移目录改名，并用 UPDATE 直接同步 _prisma_migrations 里的记录名。
 * SQL 内容不变 → checksum 不变 → 不影响任何已执行结果，不动任何业务数据。
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const OLD_NAME = '20261008161206_add_seo_geo_tables';
const NEW_NAME = '20261009000100_add_seo_geo_tables';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const before = await prisma.$queryRawUnsafe(
    'SELECT migration_name, checksum, (finished_at IS NOT NULL) AS ok FROM _prisma_migrations ORDER BY started_at',
  );
  console.log('--- 修复前 ---');
  console.table(before);

  const hit = before.find((r) => r.migration_name === OLD_NAME);
  if (!hit) {
    console.log(`未找到旧迁移记录 ${OLD_NAME}，无需改名（可能已修过）`);
    return;
  }

  const updated = await prisma.$queryRawUnsafe(
    'UPDATE _prisma_migrations SET migration_name = $1 WHERE migration_name = $2 RETURNING migration_name',
    NEW_NAME,
    OLD_NAME,
  );
  console.log('--- 已更新记录 ---');
  console.table(updated);
  console.log(`✅ ${OLD_NAME} → ${NEW_NAME}（checksum 未变，SQL 未执行）`);
}

main()
  .catch((e) => {
    console.error('❌ 失败：', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());