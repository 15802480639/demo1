import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL as string;
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const coupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minSpend: 50000,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      usageLimit: null,
      active: true,
    },
  });
  console.log('✓ coupon', coupon.code);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
