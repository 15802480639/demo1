const Database = require("libsql");
const fs = require("fs");
const base = "D:/LuoshenWorkspace/code/webshopp/prisma/";

// 1) 原库写能力
try {
  const db = new Database(base + "dev.db");
  db.exec("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
  db.exec("DROP TABLE __w");
  db.close();
  console.log("ORIG 可写 OK");
} catch (e) {
  console.log("ORIG 只读 FAIL:", e.message);
}

// 2) 全新文件写能力
try {
  const db = new Database(base + "_fresh.db");
  db.exec("CREATE TABLE t(id INTEGER)");
  db.exec("INSERT INTO t VALUES (1)");
  db.close();
  console.log("FRESH 可写 OK");
} catch (e) {
  console.log("FRESH 只读 FAIL:", e.message);
}

// 3) 复制原库到临时文件,测副本写能力(排除原文件被进程锁定)
try {
  fs.copyFileSync(base + "dev.db", base + "_copy.db");
  const db = new Database(base + "_copy.db");
  db.exec("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
  db.exec("DROP TABLE __w");
  db.close();
  console.log("COPY 可写 OK");
} catch (e) {
  console.log("COPY 只读 FAIL:", e.message);
}
