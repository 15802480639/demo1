// 用项目自身的 PrismaClient（PrismaPg adapter）连本地库 —— 与运行时同一条路径
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const tables = await prisma.$queryRawUnsafe(
  `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`
);
console.log('tables =', tables[0].n);

const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, staffRole: true } });
console.log('users:', JSON.stringify(users));

const counts = {};
for (const m of ['category', 'brand', 'product', 'pointRule', 'chatAgent']) {
  try {
    counts[m] = await prisma[m].count();
  } catch (e) {
    counts[m] = 'ERR:' + String(e.message).slice(0, 60);
  }
}
console.log('counts:', JSON.stringify(counts));

await prisma.$disconnect();
