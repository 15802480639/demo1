import { createClient } from "@libsql/client";
import fs from "fs";

const src = "D:/LuoshenWorkspace/code/webshopp/prisma/dev.db";
const p = "D:/_wsdb_final/dev_wal.db";
fs.copyFileSync(src, p);

const c = createClient({ url: "file:" + p });
await c.execute({ sql: "PRAGMA journal_mode=WAL" });
console.log("WAL 模式已设置 (已创建 -wal/-shm)");
await c.close();

// 关闭连接让文件空闲, 触发 WorkBuddy/Defender 的只读锁
console.log("等待 15s 让空闲锁生效...");
await new Promise((r) => setTimeout(r, 15000));

// 锁生效后, 新建连接尝试写 (WAL 模式应走 -wal 文件)
try {
  const c2 = createClient({ url: "file:" + p });
  await c2.execute({ sql: "CREATE TABLE IF NOT EXISTS __w(id INTEGER)" });
  await c2.execute({ sql: "DROP TABLE __w" });
  console.log("WAL 锁后写 OK -> WAL 可根治");
} catch (e) {
  console.log("WAL 锁后写 RO:", e.message);
}
