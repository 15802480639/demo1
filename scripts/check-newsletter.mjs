// 校验订阅邮箱是否真实落库
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const env = readFileSync('.env', 'utf8');
const url = (env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m) || [])[1];
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const subs = await prisma.newsletterSub.findMany({ orderBy: { createdAt: 'desc' } });
console.log(`数据库订阅总数：${subs.length}`);
for (const s of subs) {
  console.log(`  - ${s.email}  locale=${s.locale || '(空)'}  status=${s.status}  at=${s.createdAt.toISOString()}`);
}
await prisma.$disconnect();