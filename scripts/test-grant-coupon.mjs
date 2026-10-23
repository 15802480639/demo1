/**
 * 商品赠券功能端到端实测：
 * 配券 → 下单 → 支付 → 得券 → 后台可见 → 退款收回
 */
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const jar = new Map();
function ck() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size) headers.Cookie = ck();
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' });
  for (const c of (res.headers.getSetCookie?.() || [])) {
    const [kv] = c.split(';'); const i = kv.indexOf('=');
    if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const stamp = String(Date.now()).slice(-8);
const username = `gc${stamp}`;

// 1. 管理员登录
let r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@shop.com', password: 'admin1234' }) });
check('管理员登录', r.status === 200, `status=${r.status}`);

// 2. 创建测试优惠券（固定减 3000，满 10000 可用）
const couponCode = `GIFT${stamp}`;
r = await req('/api/admin/coupons', {
  method: 'POST',
  body: JSON.stringify({
    code: couponCode, type: 'fixed', value: 3000, minSpend: 10000,
    active: true, description: '赠券测试',
  }),
});
check('创建测试优惠券', r.status === 200 || r.status === 201, `status=${r.status} code=${couponCode}`);

// 3. 找一张券（刚创建的）
r = await req('/api/admin/coupons');
const coupons = r.json?.coupons || [];
const coupon = coupons.find((c) => c.code === couponCode) || coupons[0];
check('优惠券列表可查', !!coupon, `coupon=${coupon?.code}`);
if (!coupon) { console.log('\n无法继续'); process.exit(1); }

// 4. 找一个在售商品，挂上赠券
r = await req('/api/admin/products');
const products = (r.json?.products || []).filter((p) => p.status === 'active');
const prod = products.find((p) => p.skus?.length >= 1) || products[0];
check('找到在售商品', !!prod, `${prod?.name} / ${prod?.slug}`);
if (!prod) { console.log('\n没有在售商品，无法继续'); process.exit(1); }

r = await req(`/api/admin/products/${prod.id}`, {
  method: 'PUT',
  body: JSON.stringify({
    name: prod.name, categoryId: prod.category?.id, price: prod.price,
    status: prod.status, tags: [], images: [],
    earnPoints: prod.earnPoints, earnType: prod.earnType, earnValue: prod.earnValue,
    usePoints: prod.usePoints, maxPointUse: prod.maxPointUse,
    grantCouponIds: [coupon.id],
    skus: prod.skus.map((s) => ({ id: s.id, options: safeParse(s.options), stock: s.stock, price: s.price ?? undefined })),
  }),
});
check('商品挂上赠券配置', r.status === 200 && (r.json?.product?.grantCouponIds || '').includes(coupon.id), `grantCouponIds=${r.json?.product?.grantCouponIds}`);
function safeParse(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

// 5. 注册测试用户并登录
r = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username, email: `${username}@t.com`, password: 'Test1234!', name: '赠券测试' }),
});
check('注册测试用户', r.status === 200 || r.status === 201, `status=${r.status}`);

// 6. 下单（用第一个有库存的 SKU）
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ account: username, password: 'Test1234!' }) });
check('测试用户登录', r.status === 200, `status=${r.status}`);

const sku = prod.skus.find((s) => s.stock > 0) || prod.skus[0];
const skuOpts = safeParse(sku.options);
r = await req('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    items: [{ slug: prod.slug, qty: 1, options: skuOpts }],
    shipping: { name: '赠券测试', phone: '010-2222-3333', email: `${username}@t.com`, line1: '测试地址', city: 'Seoul', country: 'KR', postalCode: '04524' },
  }),
});
const order = r.json?.order;
check('下单成功', r.status === 200 && !!order?.orderNo, `orderNo=${order?.orderNo} total=₩${order?.total}`);
if (!order) { console.log('\n下单失败，终止'); process.exit(1); }

// 7. 下单后先确认还没有券（未支付不该发）
r = await req('/api/account/coupons');
const beforePay = (r.json?.coupons || []).filter((c) => c.coupon?.code === couponCode || c.code === couponCode);
check('支付前未发券', beforePay.length === 0, `持有 ${beforePay.length} 张`);

// 8. 管理员改订单为 paid → 触发发券
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@shop.com', password: 'admin1234' }) });
r = await req(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
check('订单改为已支付', r.status === 200 && r.json?.order?.status === 'paid', `status=${r.json?.order?.status}`);

// 9. 切回用户，查「我的优惠券」
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ account: username, password: 'Test1234!' }) });
r = await req('/api/account/coupons');
const mine = r.json?.coupons || [];
const got = mine.find((c) => (c.coupon?.code || c.code) === couponCode);
check('支付后用户获得赠券', !!got, `持有 ${mine.length} 张，目标券=${got ? '有' : '无'}`);
check('赠券来源标记为自动发放', got?.source === 'auto', `source=${got?.source}`);
check('赠券绑定了赠送订单', got?.grantedByOrder === order.orderNo, `grantedByOrder=${got?.grantedByOrder}`);

// 10. 后台订单详情能看到赠送的券
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@shop.com', password: 'admin1234' }) });
r = await req('/api/admin/orders');
const adminOrder = (r.json?.orders || []).find((o) => o.orderNo === order.orderNo);
check('后台订单显示赠送券', (adminOrder?.grantedCoupons?.length ?? 0) > 0, `grantedCoupons=${JSON.stringify(adminOrder?.grantedCoupons)}`);

// 11. 重复支付不重复发券（paid → shipped → paid 不会再发）
r = await req(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'shipped' }) });
r = await req(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ account: username, password: 'Test1234!' }) });
r = await req('/api/account/coupons');
const dup = (r.json?.coupons || []).filter((c) => (c.coupon?.code || c.code) === couponCode && c.grantedByOrder === order.orderNo);
check('重复支付不重复发券', dup.length === 1, `同订单赠券 ${dup.length} 张`);

// 12. 退款 → 未使用的赠送券被收回
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@shop.com', password: 'admin1234' }) });
r = await req(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'refunded' }) });
check('订单改为已退款', r.status === 200 && r.json?.order?.status === 'refunded', `status=${r.json?.order?.status}`);

jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ account: username, password: 'Test1234!' }) });
r = await req('/api/account/coupons');
const afterRefund = (r.json?.coupons || []).find((c) => (c.coupon?.code || c.code) === couponCode && c.grantedByOrder === order.orderNo);
check('退款后赠送券被收回', afterRefund?.status === 'revoked', `status=${afterRefund?.status}`);

// 13. 清理：删除测试订单/用户/券，恢复商品配置
jar.clear();
r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@shop.com', password: 'admin1234' }) });
r = await req(`/api/admin/products/${prod.id}`, {
  method: 'PUT',
  body: JSON.stringify({
    name: prod.name, categoryId: prod.category?.id, price: prod.price,
    status: prod.status, tags: [], images: [],
    earnPoints: prod.earnPoints, earnType: prod.earnType, earnValue: prod.earnValue,
    usePoints: prod.usePoints, maxPointUse: prod.maxPointUse,
    grantCouponIds: [],
    skus: prod.skus.map((s) => ({ id: s.id, options: safeParse(s.options), stock: s.stock, price: s.price ?? undefined })),
  }),
});
check('恢复商品赠券配置', r.status === 200 && (r.json?.product?.grantCouponIds || '[]') === '[]', `grantCouponIds=${r.json?.product?.grantCouponIds}`);

// 删测试券
try {
  r = await req('/api/admin/coupons');
  const all = r.json?.coupons || [];
  const target = all.find((c) => c.code === couponCode);
  if (target) {
    const del = await req(`/api/admin/coupons?id=${target.id}`, { method: 'DELETE' });
    check('删除测试优惠券', del.status === 200, `id=${target.id}`);
  }
} catch { /* 券删除失败不阻塞 */ }

// 删测试用户（直接走 DB）
console.log('\n—— 数据库清理（订单/用户）——');
const { PrismaClient } = await import('@prisma/client');
const { PrismaPg } = await import('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const u = await prisma.user.findFirst({ where: { username } });
if (u) {
  const orders = await prisma.order.findMany({ where: { userId: u.id }, select: { id: true } });
  for (const o of orders) {
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.pointTransaction.deleteMany({ where: { orderId: o.id } });
    await prisma.userCoupon.deleteMany({ where: { grantedByOrder: o.orderNo } });
    await prisma.order.delete({ where: { id: o.id } });
  }
  await prisma.pointTransaction.deleteMany({ where: { userId: u.id } });
  await prisma.userCoupon.deleteMany({ where: { userId: u.id } });
  await prisma.address.deleteMany({ where: { userId: u.id } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: u.id } } });
  await prisma.cart.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
  console.log(`  ✗ 删除测试用户 ${username} 及其 ${orders.length} 个订单`);
}
const oc = await prisma.order.count();
const uc = await prisma.user.count();
console.log(`  最终：订单 ${oc} 条 / 用户 ${uc} 个`);
await prisma.$disconnect();

console.log(`\n========== 结果：${pass} 通过 / ${fail} 失败 ==========`);
process.exit(fail > 0 ? 1 : 0);
