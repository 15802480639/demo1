import { createClient } from "@libsql/client";

const url = "file:C:/Users/Administrator/AppData/Local/webshopp-data/dev.db";
for (let i = 0; i < 6; i++) {
  try {
    const c = createClient({ url });
    await c.execute({ sql: "CREATE TABLE IF NOT EXISTS __w(id INTEGER)" });
    await c.execute({ sql: "DROP TABLE __w" });
    console.log("尝试", i, "OK -> 间歇锁,可避开");
    process.exit(0);
  } catch (e) {
    console.log("尝试", i, "RO:", e.message);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
console.log("全部失败 -> 持续锁");
