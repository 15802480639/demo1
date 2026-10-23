/**
 * webshopp 积分/优惠券体系 —— 全面 E2E 实测（2026-10-23）
 *
 * 覆盖：
 *   订单A 普通购买 → 支付返积分（全局5%）
 *   订单B 积分抵扣 → 下单扣分 → 支付按实付返分
 *   订单C 商品独立返积分比例(20%) + 购买赠券（自动发券）
 *   订单D 优惠券码 + 积分混合抵扣
 *   订单E 退款冲回（积分扣回 + 券收回 + 幂等）
 *   后台接口：手动加减分 / 后台发券 / 积分规则读写 / 订单列表积分列
 *   账户接口：积分中心 / 我的优惠券 / 结算试算
 *   负例：未登录试算、无权限调后台、不满门槛用积分、游客单用积分
 *   清理：删除全部测试订单/用户/流水，恢复券核销数、SKU库存、商品配置、积分规则
 *
 * 用法：node scripts/e2e-orders.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';

// ---------- 双 cookie jar（管理员 / 测试用户）----------
function newJar() { return new Map(); }
function ck(jar) { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
async function req(jar, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar && jar.size) headers.Cookie = ck(jar);
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
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; failures.push(name); console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const adminJar = newJar();
const userJar = newJar();
const anonJar = newJar();
const ADMIN = { account: 'admin@shop.com', password: 'admin1234' };
const stamp = String(Date.now()).slice(-8);
const TEST_USER = {
  username: `e2e${stamp}`,
  email: `e2e-${stamp}@test.com`,
  password: 'Test1234!',
  name: 'E2E测试用户',
};
const SHIPPING = {
  email: TEST_USER.email, name: TEST_USER.name,
  line1: '서울특별시 강남구 테헤란로 123', line2: '4층',
  city: '서울', state: '서울특별시', country: 'KR', postalCode: '06234', phone: '010-1234-5678',
};

// 测试过程状态（供清理用）
const created = { orders: [], guestUsers: [], skuRestore: [], couponRestore: [], productBackup: null, ruleChanged: false };

// ---- 把后台 GET 到的商品原样转成「编辑表单提交格式」 ----
// 必须照抄 admin/products/page.tsx 的转换：options/values 是 JSON 字符串，要解析成对象/数组，
// 否则 PUT 回去会把 SKU 选项写成乱码、规格值双重编码。
function parseOpts(s) { try { const o = JSON.parse(s ?? '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
function parseSpecValues(v) {
  try { const arr = JSON.parse(v ?? '[]'); if (!Array.isArray(arr)) return []; return arr.map((x) => (typeof x === 'string' ? { ko: x } : x)); } catch { return []; }
}
function specsFromSkus(skus) {
  const map = new Map();
  for (const sk of skus) {
    const o = parseOpts(sk.options);
    for (const [k, v] of Object.entries(o)) {
      if (!k || !v || k === 'Option') continue;
      if (!map.has(k)) map.set(k, new Set());
      map.get(k).add(v);
    }
  }
  return Array.from(map.entries()).map(([k, set]) => ({ name: k, values: Array.from(set).map((v) => ({ ko: v })) }));
}
function toFormPayload(p) {
  return {
    name: p.name,
    nameZh: p.nameZh || undefined,
    code: p.code || undefined,
    gender: p.gender || undefined,
    brandId: p.brand?.id || undefined,
    categoryId: p.category?.id,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    status: p.status,
    description: p.description || undefined,
    descriptionZh: p.descriptionZh || undefined,
    tags: (() => { try { const a = JSON.parse(p.tags ?? '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })(),
    images: (() => { try { const a = JSON.parse(p.images ?? '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })(),
    earnPoints: p.earnPoints,
    earnType: p.earnType,
    earnValue: p.earnValue,
    usePoints: p.usePoints,
    maxPointUse: p.maxPointUse,
    grantCouponIds: (() => { try { const a = JSON.parse(p.grantCouponIds ?? '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })(),
    skus: p.skus.map((s) => ({ id: s.id, options: parseOpts(s.options), stock: s.stock, price: s.price == null ? undefined : Number(s.price) })),
    specs: p.specs?.length
      ? p.specs.map((sp) => ({ name: sp.name, nameZh: sp.nameZh ?? undefined, values: parseSpecValues(sp.values) }))
      : specsFromSkus(p.skus),
  };
}

async function main() {
  console.log(`\n===== webshopp 积分体系全面 E2E @ ${BASE} =====\n`);

  // ===== 0. 登录 & 找用户 =====
  let r = await req(adminJar, '/api/auth/login', { method: 'POST', body: JSON.stringify(ADMIN) });
  check('管理员登录', r.status === 200 && r.json?.ok !== false, `status=${r.status}`);

  r = await req(userJar, '/api/auth/register', { method: 'POST', body: JSON.stringify(TEST_USER) });
  check('注册测试用户', r.status === 200 || r.status === 201, `status=${r.status} ${r.text.slice(0, 100)}`);
  r = await req(userJar, '/api/auth/login', { method: 'POST', body: JSON.stringify({ account: TEST_USER.username, password: TEST_USER.password }) });
  check('测试用户登录', r.status === 200, `status=${r.status}`);

  r = await req(adminJar, '/api/admin/customers');
  const me = (r.json?.customers || []).find((c) => c.email === TEST_USER.email);
  check('后台客户列表能查到测试用户', !!me, me ? `id=${me.id.slice(0, 8)}… points=${me.points}` : '未找到');
  const uid = me.id;

  // ===== 1. 账户接口基线 =====
  r = await req(userJar, '/api/account/points');
  check('GET /api/account/points 初始余额为0', r.status === 200 && r.json?.points === 0, `points=${r.json?.points}`);
  check('积分中心含获得途径说明', Array.isArray(r.json?.earnWays) && r.json.earnWays.length >= 2);
  r = await req(userJar, '/api/account/coupons');
  check('GET /api/account/coupons 初始为空', r.status === 200 && (r.json?.coupons || []).length === 0);

  // ===== 2. 负例：未登录试算 =====
  r = await req(anonJar, '/api/account/points/quote', { method: 'POST', body: JSON.stringify({ items: [{ slug: 'x', qty: 1, price: 100000 }] }) });
  check('负例：未登录试算被拒', r.status === 401 || r.json?.reason === 'UNAUTHORIZED', `status=${r.status} reason=${r.json?.reason}`);

  // ===== 3. 负例：无权限调后台接口 =====
  r = await req(anonJar, `/api/admin/customers/${uid}/points`, { method: 'POST', body: JSON.stringify({ amount: 100 }) });
  check('负例：游客调后台加减分被拒(403)', r.status === 403, `status=${r.status}`);

  // ===== 4. 商品 & 券数据（走后台接口拿全量）=====
  r = await req(adminJar, '/api/admin/products');
  const P1 = (r.json?.products || []).find((p) => p.slug === '26padded-jacket-khaki');
  const P2 = (r.json?.products || []).find((p) => p.slug === '26padded-jacket-black');
  check('后台商品列表可读（含SKU/积分配置）', !!P1 && !!P2 && Array.isArray(P1?.skus) && P1.skus.length === 4,
    P1 ? `P1 skus=${P1.skus.length} earnValue=${P1.earnValue} grant=${P1.grantCouponIds}` : '缺失');
  created.productBackup = JSON.parse(JSON.stringify(P1));

  r = await req(adminJar, '/api/admin/coupons');
  const couponList = r.json?.coupons || [];
  const WELCOME = couponList.find((c) => c.code === 'WELCOME10');
  const GIFT = couponList.find((c) => c.code === 'GIFT66784283');
  check('后台券列表可读', !!WELCOME && !!GIFT, `WELCOME10=${!!WELCOME} GIFT=${!!GIFT}`);
  const WELCOME_USED_BEFORE = WELCOME?.usedCount ?? 0;

  const skuM1 = P1.skus.find((s) => (s.options || '').includes('"Size":"M"'));
  const skuL1 = P1.skus.find((s) => (s.options || '').includes('"Size":"L"'));
  const skuS1 = P1.skus.find((s) => (s.options || '').includes('"Size":"S"'));
  const skuM2 = P2.skus.find((s) => (s.options || '').includes('"Size":"M"'));
  const stockBefore = { [skuM1.id]: skuM1.stock, [skuL1.id]: skuL1.stock, [skuS1.id]: skuS1.stock, [skuM2.id]: skuM2.stock };

  // ===== 5. 后台手动加积分 =====
  r = await req(adminJar, `/api/admin/customers/${uid}/points`, { method: 'POST', body: JSON.stringify({ amount: 30000, remark: 'E2E手动充值' }) });
  check('后台手动+30000积分', r.status === 200 && r.json?.balance === 30000, `balance=${r.json?.balance}`);
  r = await req(userJar, '/api/account/points');
  const txns0 = r.json?.transactions || [];
  check('流水出现 admin_add 记录', txns0.some((t) => t.type === 'admin_add' && t.amount === 30000));

  // ===== 6. 结算试算 =====
  r = await req(userJar, '/api/account/points/quote', { method: 'POST', body: JSON.stringify({ items: [{ slug: P1.slug, qty: 2, price: P1.price }] }) });
  check('试算：2件×115000 最多抵69000₩（积分余额30000封顶）', r.json?.eligible === true && r.json?.maxDiscount === 69000 && r.json?.maxPoints === 30000,
    `eligible=${r.json?.eligible} maxDiscount=${r.json?.maxDiscount} maxPoints=${r.json?.maxPoints}（余额封顶）1积分值=${r.json?.onePointValue}₩`);
  r = await req(userJar, '/api/account/points/quote', { method: 'POST', body: JSON.stringify({ items: [{ slug: P1.slug, qty: 1, price: 30000 }] }) });
  check('负例：不满50000门槛不可用积分', r.json?.eligible === false && r.json?.reason === 'BELOW_MIN', `reason=${r.json?.reason}`);

  // ===== 7. 订单A：普通购买返积分 =====
  r = await req(userJar, '/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug: P1.slug, qty: 2, size: 'M', options: { Color: 'KHAKI', Size: 'M' } }],
      shipping: SHIPPING,
    }),
  });
  const orderA = r.json?.order;
  check('订单A创建成功（2件M码）', r.status === 200 && !!orderA?.orderNo, `orderNo=${orderA?.orderNo} total=${orderA?.total}`);
  check('订单A响应含规格快照 skuLabel', !!orderA?.items?.[0]?.skuLabel, `skuLabel=${orderA?.items?.[0]?.skuLabel}`);
  created.orders.push(orderA.orderNo);
  r = await req(adminJar, `/api/admin/orders/${orderA.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
  check('订单A标记已支付', r.status === 200);
  r = await req(userJar, '/api/account/points');
  check('订单A返积分 5%×230000=11500', r.json?.points === 41500, `余额=${r.json?.points}（期望41500）`);
  check('订单A流水 type=earn 11500', (r.json?.transactions || []).some((t) => t.type === 'earn' && t.amount === 11500 && t.orderNo === orderA.orderNo));

  // ===== 8. 订单B：积分抵扣 =====
  r = await req(userJar, '/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug: P1.slug, qty: 1, size: 'L', options: { Color: 'KHAKI', Size: 'L' } }],
      shipping: SHIPPING,
      usePoints: 10000,
    }),
  });
  const orderB = r.json?.order;
  check('订单B创建（用10000积分）', r.status === 200 && orderB?.pointsUsed === 10000 && orderB?.pointsDiscount === 10000,
    `pointsUsed=${orderB?.pointsUsed} pointsDiscount=${orderB?.pointsDiscount} total=${orderB?.total}`);
  check('订单B合计=115000-10000=105000', orderB?.total === 105000, `total=${orderB?.total}`);
  created.orders.push(orderB.orderNo);
  r = await req(userJar, '/api/account/points');
  check('下单即扣积分 → 余额31500', r.json?.points === 31500, `余额=${r.json?.points}`);
  r = await req(adminJar, `/api/admin/orders/${orderB.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
  r = await req(userJar, '/api/account/points');
  check('订单B按实付返 5%×105000=5250 → 余额36750', r.json?.points === 36750, `余额=${r.json?.points}`);

  // ===== 9. 订单C：商品独立返积分比例 + 购买赠券 =====
  // ⚠️ 必须重新GET：updateProduct 会整体覆盖 stock，用旧库存快照会把前面订单扣的库存加回去
  r = await req(adminJar, '/api/admin/products');
  const P1Now = (r.json?.products || []).find((p) => p.slug === P1.slug);
  const p1Patch = { ...toFormPayload(P1Now), earnType: 'percent', earnValue: 20, grantCouponIds: [WELCOME.id] };
  r = await req(adminJar, `/api/admin/products/${P1.id}`, { method: 'PUT', body: JSON.stringify(p1Patch) });
  check('后台把P1改为返20%+赠WELCOME10券', r.status === 200 && r.json?.product?.earnValue === 20, `earnValue=${r.json?.product?.earnValue}`);
  r = await req(userJar, '/api/orders', {
    method: 'POST',
    body: JSON.stringify({ items: [{ slug: P1.slug, qty: 1, size: 'S', options: { Color: 'KHAKI', Size: 'S' } }], shipping: SHIPPING }),
  });
  const orderC = r.json?.order;
  check('订单C创建成功', r.status === 200 && !!orderC?.orderNo, `orderNo=${orderC?.orderNo}`);
  created.orders.push(orderC.orderNo);
  r = await req(adminJar, `/api/admin/orders/${orderC.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
  r = await req(userJar, '/api/account/points');
  check('订单C按商品独立比例返 20%×115000=23000 → 余额59750', r.json?.points === 59750, `余额=${r.json?.points}`);
  r = await req(userJar, '/api/account/coupons');
  const autoCoupon = (r.json?.coupons || []).find((c) => c.grantedByOrder === orderC.orderNo);
  check('支付后自动获得 WELCOME10 券', !!autoCoupon && autoCoupon.code === 'WELCOME10' && autoCoupon.source === 'auto' && autoCoupon.status === 'available',
    autoCoupon ? `source=${autoCoupon.source} status=${autoCoupon.status}` : '未找到');

  // ===== 10. 订单E-1：退款订单C（冲回积分+收回券）=====
  r = await req(adminJar, `/api/admin/orders/${orderC.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'refunded' }) });
  check('订单C标记退款', r.status === 200);
  r = await req(userJar, '/api/account/points');
  check('退款扣回赠送积分23000 → 余额36750', r.json?.points === 36750, `余额=${r.json?.points}`);
  check('退款流水 type=refund_deduct -23000', (r.json?.transactions || []).some((t) => t.type === 'refund_deduct' && t.amount === -23000));
  r = await req(userJar, '/api/account/coupons');
  const revokedCoupon = (r.json?.coupons || []).find((c) => c.grantedByOrder === orderC.orderNo);
  check('退款收回未使用的赠券', revokedCoupon?.status === 'revoked', `status=${revokedCoupon?.status}`);
  // 幂等：再退一次不重复扣
  const balBefore = r.json ? (await req(userJar, '/api/account/points')).json?.points : 0;
  await req(adminJar, `/api/admin/orders/${orderC.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'refunded' }) });
  r = await req(userJar, '/api/account/points');
  check('重复退款不重复扣积分（幂等）', r.json?.points === balBefore && (r.json?.transactions || []).filter((t) => t.type === 'refund_deduct').length === 1,
    `余额=${r.json?.points} refund_deduct流水数=${(r.json?.transactions || []).filter((t) => t.type === 'refund_deduct').length}`);

  // 恢复P1商品配置（必须重新GET：updateProduct 会整体覆盖 stock，
  // 用旧库存会把订单A/B/C/D扣减的数量又加回去，造成库存虚高）
  r = await req(adminJar, '/api/admin/products');
  const P1Fresh = (r.json?.products || []).find((p) => p.slug === P1.slug);
  r = await req(adminJar, `/api/admin/products/${P1.id}`, { method: 'PUT', body: JSON.stringify({ ...toFormPayload(P1Fresh), earnType: 'percent', earnValue: 0, grantCouponIds: [] }) });
  check('恢复P1商品配置（返0%+无赠券，库存不被旧值覆盖）', r.status === 200 && r.json?.product?.earnValue === 0 && r.json?.product?.grantCouponIds === '[]',
    `earnValue=${r.json?.product?.earnValue} grant=${r.json?.product?.grantCouponIds}`);

  // ===== 11. 订单D：优惠券码 + 积分混合 =====
  r = await req(userJar, '/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug: P2.slug, qty: 1, size: 'M', options: { Color: 'BLACK', Size: 'M' } }],
      shipping: SHIPPING,
      couponCode: 'WELCOME10',
      usePoints: 5000,
    }),
  });
  const orderD = r.json?.order;
  check('订单D创建（WELCOME10券+5000积分）', r.status === 200 && orderD?.couponCode === 'WELCOME10' && orderD?.discount === 11500,
    `coupon=${orderD?.couponCode} discount=${orderD?.discount} pointsUsed=${orderD?.pointsUsed} total=${orderD?.total}`);
  check('订单D合计=115000-11500-5000+运费3000=101500（不满10万₩收运费）', orderD?.total === 101500, `total=${orderD?.total} shippingFee=${orderD?.shippingFee}`);
  created.orders.push(orderD.orderNo);
  r = await req(userJar, '/api/account/points');
  check('混合抵扣后余额=36750-5000=31750', r.json?.points === 31750, `余额=${r.json?.points}`);
  r = await req(adminJar, `/api/admin/orders/${orderD.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
  r = await req(userJar, '/api/account/points');
  check('订单D按实付返 5%×98500=4925 → 余额36675', r.json?.points === 36675, `余额=${r.json?.points}`);

  // ===== 12. 订单E-2：退款订单A（纯返积分订单的冲回）=====
  r = await req(adminJar, `/api/admin/orders/${orderA.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'refunded' }) });
  r = await req(userJar, '/api/account/points');
  check('订单A退款扣回11500 → 余额25175', r.json?.points === 25175, `余额=${r.json?.points}`);

  // ===== 13. 负例：游客单带积分（无会话应忽略）=====
  r = await req(anonJar, '/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug: P1.slug, qty: 1, size: 'M', options: { Color: 'KHAKI', Size: 'M' } }],
      shipping: { ...SHIPPING, email: `guest-${stamp}@test.com`, name: '游客测试' },
      usePoints: 999999,
    }),
  });
  const guestOrder = r.json?.order;
  check('负例：游客单忽略积分抵扣', r.status === 200 && guestOrder?.pointsUsed === 0, `pointsUsed=${guestOrder?.pointsUsed}`);
  if (guestOrder) created.orders.push(guestOrder.orderNo);
  created.guestUsers.push(`guest-${stamp}@test.com`);

  // ===== 14. 后台发券 + 订单列表积分列 + 积分规则读写 =====
  r = await req(adminJar, `/api/admin/customers/${uid}/coupons`, { method: 'POST', body: JSON.stringify({ couponId: GIFT.id }) });
  check('后台给客户发券（GIFT）', r.status === 200, `status=${r.status}`);
  r = await req(userJar, '/api/account/coupons');
  check('用户券列表出现 source=admin 的券', (r.json?.coupons || []).some((c) => c.source === 'admin' && c.code === 'GIFT66784283'));

  r = await req(adminJar, '/api/admin/orders');
  const adminOrderRows = r.json?.orders || [];
  const rowA = adminOrderRows.find((o) => o.orderNo === orderA.orderNo);
  const rowD = adminOrderRows.find((o) => o.orderNo === orderD.orderNo);
  check('后台订单列表含积分列（used/discount/earned）', !!rowA && rowA.pointsEarned === 11500 && rowD.pointsUsed === 5000 && rowD.pointsDiscount === 5000,
    rowA ? `A: earned=${rowA.pointsEarned} | D: used=${rowD?.pointsUsed} discount=${rowD?.pointsDiscount}` : '订单行缺失');
  check('后台订单列表含规格列', !!rowA?.items?.[0]?.skuLabel, `skuLabel=${rowA?.items?.[0]?.skuLabel}`);

  r = await req(adminJar, '/api/admin/points');
  check('后台读取积分规则', r.json?.rule?.earnPercent === 5 && r.json?.rule?.minSpendForUse === 50000, JSON.stringify(r.json?.rule));
  r = await req(adminJar, '/api/admin/points', { method: 'PUT', body: JSON.stringify({ earnPercent: 9 }) });
  check('后台修改积分规则(5%→9%)', r.status === 200 && r.json?.rule?.earnPercent === 9);
  r = await req(adminJar, '/api/admin/points', { method: 'PUT', body: JSON.stringify({ earnPercent: 5, minSpendForUse: 50000, pointsPerKrw: 100, maxUsePercent: 30 }) });
  check('恢复积分规则为默认值', r.status === 200 && r.json?.rule?.earnPercent === 5 && r.json?.rule?.minSpendForUse === 50000);

  // ===== 15. DB 落库终验（admin-http-tester 原则：库才是最终真相）=====
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const env = readFileSync('.env', 'utf8');
  const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const dbOrderA = await prisma.order.findUnique({ where: { orderNo: orderA.orderNo }, include: { items: true } });
  check('DB: 订单A pointsEarned=11500 且已结算', dbOrderA?.pointsEarned === 11500 && dbOrderA?.pointsSettled === true, `earned=${dbOrderA?.pointsEarned} settled=${dbOrderA?.pointsSettled}`);
  check('DB: 订单A 明细行有规格快照', !!dbOrderA?.items?.[0]?.skuLabel && !!dbOrderA?.items?.[0]?.options, `options=${dbOrderA?.items?.[0]?.options}`);
  const dbSku = await prisma.sku.findUnique({ where: { id: skuM1.id } });
  // 此时已扣：订单A(-2 M码) + 游客单(-1 M码) = -3
  check('DB: SKU库存按单扣减（M码 12-2-1=9）', dbSku?.stock === stockBefore[skuM1.id] - 3, `${stockBefore[skuM1.id]} → ${dbSku?.stock}`);

  // ===== 16. 清理：恢复到基线 =====
  console.log('\n----- 清理测试数据 -----');
  for (const orderNo of created.orders) {
    const o = await prisma.order.findUnique({ where: { orderNo }, include: { items: true } });
    if (!o) continue;
    for (const it of o.items) {
      if (it.skuId) await prisma.sku.update({ where: { id: it.skuId }, data: { stock: { increment: it.quantity } } });
    }
    await prisma.pointTransaction.deleteMany({ where: { orderId: o.id } });
    await prisma.userCoupon.deleteMany({ where: { grantedByOrder: orderNo } });
    await prisma.shipment.deleteMany({ where: { orderId: o.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.order.delete({ where: { id: o.id } });
    console.log(`  🗑  订单 ${orderNo} 及关联数据已删，SKU库存已恢复`);
  }
  const testU = await prisma.user.findUnique({ where: { email: TEST_USER.email } });
  if (testU) {
    await prisma.pointTransaction.deleteMany({ where: { userId: testU.id } });
    await prisma.userCoupon.deleteMany({ where: { userId: testU.id } });
    await prisma.address.deleteMany({ where: { userId: testU.id } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: testU.id } } });
    await prisma.cart.deleteMany({ where: { userId: testU.id } });
    await prisma.user.delete({ where: { id: testU.id } });
    console.log(`  🗑  测试用户 ${TEST_USER.email} 已删`);
  }
  for (const email of created.guestUsers) {
    const gu = await prisma.user.findUnique({ where: { email } });
    if (gu) {
      await prisma.pointTransaction.deleteMany({ where: { userId: gu.id } });
      await prisma.userCoupon.deleteMany({ where: { userId: gu.id } });
      await prisma.address.deleteMany({ where: { userId: gu.id } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: gu.id } } });
      await prisma.cart.deleteMany({ where: { userId: gu.id } });
      await prisma.user.delete({ where: { id: gu.id } });
      console.log(`  🗑  游客用户 ${email} 已删`);
    }
  }
  // 券核销数恢复
  if (WELCOME_USED_BEFORE !== (WELCOME?.usedCount ?? 0)) {
    // D 单核销了 1 次，恢复
  }
  const wl = await prisma.coupon.findUnique({ where: { code: 'WELCOME10' } });
  if (wl && wl.usedCount !== WELCOME_USED_BEFORE) {
    await prisma.coupon.update({ where: { code: 'WELCOME10' }, data: { usedCount: WELCOME_USED_BEFORE } });
    console.log(`  🗑  WELCOME10 核销数恢复 ${wl.usedCount} → ${WELCOME_USED_BEFORE}`);
  }

  // 终检：与基线一致
  const [oc, uc, tc, ucc] = await Promise.all([
    prisma.order.count(), prisma.user.count(), prisma.pointTransaction.count(), prisma.userCoupon.count(),
  ]);
  check('清理后订单数回到基线12', oc === 12, `当前=${oc}`);
  check('清理后用户数回到基线6', uc === 6, `当前=${uc}`);
  check('清理后积分流水回到基线1', tc === 1, `当前=${tc}`);
  check('清理后用户券回到基线1', ucc === 1, `当前=${ucc}`);
  const skuAfter = await prisma.sku.findUnique({ where: { id: skuM1.id } });
  check('SKU库存恢复原值', skuAfter?.stock === stockBefore[skuM1.id], `${skuAfter?.stock}（期望${stockBefore[skuM1.id]}）`);
  await prisma.$disconnect();

  // ===== 汇总 =====
  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  if (failures.length) console.log('失败项：\n' + failures.map((f) => `  ❌ ${f}`).join('\n'));
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('E2E 脚本异常：', e); process.exit(2); });
