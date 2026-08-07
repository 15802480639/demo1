// 测试 libSQL 在 Windows 下 file: URL 的读写能力，定位 SQLITE_READONLY 根因
import { createClient } from "@libsql/client";

const variants = [
  "file:D:/LuoshenWorkspace/code/webshopp/prisma/dev.db",
  "file:///D:/LuoshenWorkspace/code/webshopp/prisma/dev.db",
  "file:D:/LuoshenWorkspace/code/webshopp/prisma/dev.db?mode=rwc",
];

for (const url of variants) {
  let client;
  try {
    client = createClient({ url });
    // 无害的写回环：建表 -> 插入 -> 删表
    await client.execute({
      sql: "CREATE TABLE IF NOT EXISTS __libsql_wtest (id INTEGER PRIMARY KEY)",
    });
    await client.execute({ sql: "INSERT INTO __libsql_wtest (id) VALUES (1)" });
    const r = await client.execute({ sql: "SELECT count(*) AS c FROM __libsql_wtest" });
    await client.execute({ sql: "DROP TABLE __libsql_wtest" });
    console.log(`OK   write succeeded | url=${url} | count=${r.rows[0].c}`);
  } catch (e) {
    console.log(`FAIL | url=${url} | err=${e.message}`);
  } finally {
    try { client?.close?.(); } catch {}
  }
}
