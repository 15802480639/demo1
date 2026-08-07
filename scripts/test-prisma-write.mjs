import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const r = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    console.log("READ OK", JSON.stringify(r));
    await prisma.$executeRawUnsafe("CREATE TABLE IF NOT EXISTS __w(id INTEGER)");
    await prisma.$executeRawUnsafe("INSERT INTO __w VALUES (1)");
    const c = await prisma.$queryRawUnsafe("SELECT count(*) AS c FROM __w");
    await prisma.$executeRawUnsafe("DROP TABLE __w");
    console.log("WRITE OK via PrismaLibSql+file:URL, count=", c[0].c);
  } catch (e) {
    console.log("ERR", e.message);
  }
  await prisma.$disconnect();
})();
