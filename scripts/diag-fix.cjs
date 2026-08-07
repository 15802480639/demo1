const fs = require("fs");
const Database = require("libsql");
const base = "D:/LuoshenWorkspace/code/webshopp/prisma/";
const orig = base + "dev.db";
const bak = base + "dev.db.bak";
const neo = base + "dev.db.new";

// 1) 尝试重命名原文件(若未被锁即可成功)
let renamed = false;
try {
  fs.renameSync(orig, bak);
  renamed = true;
  console.log("STEP1 原 dev.db 重命名成功 -> 当前未被锁");
} catch (e) {
  console.log("STEP1 原 dev.db 重命名失败(被锁):", e.code, e.message);
}

// 2) 准备一份可写的数据副本
let target;
try {
  if (renamed) {
    fs.copyFileSync(bak, orig); // 还原 dev.db 名字(新创建文件,理论上可写)
    target = orig;
    console.log("STEP2 已从 .bak 还原 dev.db");
  } else {
    fs.copyFileSync(orig, neo);
    target = neo;
    console.log("STEP2 已复制为 dev.db.new (因原文件被锁)");
  }
} catch (e) {
  console.log("STEP2 复制失败:", e.message);
  process.exit(1);
}

// 3) 验证目标库可写
try {
  const db = new Database(target);
  db.exec("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
  db.exec("DROP TABLE __w");
  db.close();
  console.log("STEP3 目标库可写 OK =>", target);
} catch (e) {
  console.log("STEP3 目标库仍只读:", e.message, "=>", target);
}
