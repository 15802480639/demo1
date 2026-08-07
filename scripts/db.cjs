// 本地嵌入式 PostgreSQL 启动脚本（开发态，持久化到 .pgdata）
// 生产环境改用 Supabase / Neon：只需把 .env 的 DATABASE_URL 换掉
const EmbeddedPostgres = require('embedded-postgres').default;
const fs = require('fs');

const dataDir = 'C:\\Users\\Administrator\\.webshopp-pg';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

(async () => {
  try {
    console.log('[db] initialising PostgreSQL …');
    await pg.initialise();
    console.log('[db] starting PostgreSQL …');
    await pg.start();
    try {
      await pg.createDatabase('webshopp');
      console.log('[db] created database "webshopp"');
    } catch (e) {
      console.log('[db] database step:', e.message);
    }
    console.log('[db] READY → postgresql://postgres:postgres@localhost:5432/webshopp');
    process.stdin.resume(); // 保持进程，使 PG 子进程持续运行
  } catch (e) {
    console.error('[db] FAILED:', e);
    process.exit(1);
  }
})();
