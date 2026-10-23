/**
 * DB 基线快照：记录测试前的订单/用户/积分/券/商品配置，供测试后清理比对。
 * 用法：node scripts/e2e-snapshot.mjs <output.json>
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const [orders, users, txns, userCoupons, rule, coupons, products] = await Promise.all([
  prisma.order.count(),
  prisma.user.count(),
  prisma.pointTransaction.count(),
  prisma.userCoupon.count(),
  prisma.pointRule.findFirst(),
  prisma.coupon.findMany({
    select: { id: true, code: true, type: true, value: true, active: true, usedCount: true, usageLimit: true, minSpend: true, productIds: true, startsAt: true, expiresAt: true },
    orderBy: { code: 'asc' },
  }),
  prisma.product.findMany({
    where: { status: 'active' },
    select: {
      id: true, slug: true, name: true, price: true,
      earnPoints: true, earnType: true, earnValue: true,
      usePoints: true, maxPointUse: true, grantCouponIds: true,
      skus: { select: { id: true, skuCode: true, price: true, stock: true, options: true } },
    },
    orderBy: { createdAt: 'asc' },
  }),
]);

const snap = {
  ts: new Date().toISOString(),
  counts: { orders, users, pointTransactions: txns, userCoupons },
  pointRule: rule,
  coupons,
  products,
};
writeFileSync(process.argv[2] || 'e2e-baseline.json', JSON.stringify(snap, null, 2));

console.log(`\n=== DB 基线 @ ${snap.ts} ===`);
console.log(`订单 ${orders} | 用户 ${users} | 积分流水 ${txns} | 用户券 ${userCoupons}`);
console.log(`\n积分规则：enabled=${rule?.enabled} | 返积分 ${rule?.earnPercent ?? '—'}% | 满 ${rule?.minSpendForUse ?? '—'}₩ 可用 | ${rule?.pointsPerKrw ?? '—'}积分=1₩ | 抵扣上限 ${rule?.maxUsePercent ?? '—'}%`);
console.log(`\n优惠券 ${coupons.length} 张：`);
for (const c of coupons) console.log(`  ${c.code} | ${c.type}=${c.value} | active=${c.active} | 已用 ${c.usedCount}/${c.usageLimit ?? '∞'} | 满${c.minSpend} | 适用商品=${c.productIds || '全场'}`);
console.log(`\n在售商品 ${products.length} 个（积分配置）：`);
for (const p of products.slice(0, 12)) {
  console.log(`  ${p.slug} | ₩${p.price} | 返积分=${p.earnPoints ? `${p.earnType}:${p.earnValue}` : '关'} | 可抵扣=${p.usePoints}(上限${p.maxPointUse}%) | 赠券=${p.grantCouponIds || '无'} | SKU×${p.skus.length}`);
}
if (products.length > 12) console.log(`  …另有 ${products.length - 12} 个`);

await prisma.$disconnect();
