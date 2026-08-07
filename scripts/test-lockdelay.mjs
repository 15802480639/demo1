import { createClient } from "@libsql/client";
import fs from "fs";

const src = "D:/LuoshenWorkspace/code/webshopp/prisma/dev.db";
const p = "D:/_wsdb_final/dev_delay.db";
fs.copyFileSync(src, p);
console.log("已创建", p, "开始每2秒探测锁生效时间");
for (let i = 0; i < 16; i++) {
  try {
    const c = createClient({ url: "file:" + p });
    await c.execute({ sql: "CREATE TABLE IF NOT EXISTS __w(id INTEGER)" });
    await c.execute({ sql: "DROP TABLE __w" });
    console.log(i * 2 + "s OK (未锁)");
  } catch (e) {
    console.log(i * 2 + "s RO (锁已生效)");
    break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}
