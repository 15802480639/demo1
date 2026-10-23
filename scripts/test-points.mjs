/**
 * 积分系统端到端实测脚本。
 *
 * 用法：node scripts/test-points.mjs [baseUrl]
 * 直接打真实 HTTP 接口，验证：登录 → 查积分 → 手动加积分 → 下单抵扣 → 支付返积分 → 退款扣回
 */
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

// 本地开发用 HTTP，cookie 不能带 Secure
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size) headers.Cookie = cookieHeader();
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    redirect: 'manual',
  });
  // 收集 cookie
  const sc = res.headers.getSetCookie?.() || [];
  for (const c of sc) {
    const [kv] = c.split(';');
    const idx = kv.indexOf('=');
    if (idx > 0) {
      const k = kv.slice(0, idx).trim();
      const v = kv.slice(idx + 1).trim();
      if (v === '' || /expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k);
      else jar.set(k, v);
    }
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html 页面 */
  }
  return { status: res.status, json, text };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const ADMIN = { email: 'admin@shop.com', password: 'admin1234' };
const TEST_USER = {
  username: `pt${String(Date.now()).slice(-8)}`,
  email: `points-test-${Date.now()}@test.com`,
  password: 'Test1234!',
  name: '积分测试用户',
};

async function main() {
  console.log(`\n=== 积分系统实测 @ ${BASE} ===\n`);

  // 1. 注册测试用户
  let r = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(TEST_USER),
  });
  check('注册测试用户', r.status === 200 || r.status === 201, `status=${r.status} ${r.text.slice(0, 120)}`);
  if (r.status >= 400) {
    // 可能已存在，退而用登录
    r = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: TEST_USER.username, password: TEST_USER.password }),
    });
    check('登录测试用户（注册已存在时回退）', r.status === 200, `status=${r.status}`);
  }

  // 2. 登录拿 session
  r = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: TEST_USER.username, password: TEST_USER.password }),
  });
  check('用户登录', r.status === 200 && jar.has('ws_session'), `status=${r.status}`);

  // 3. 查积分（初始应为 0）
  r = await req('/api/account/points');
  const p0 = r.json?.points;
  check('查询积分中心', r.status === 200 && typeof p0 === 'number', `points=${p0}`);
  check('积分规则返回 earnPercent', typeof r.json?.rule?.earnPercent === 'number', `earnPercent=${r.json?.rule?.earnPercent}`);
  check('获得途径说明存在', Array.isArray(r.json?.earnWays) && r.json.earnWays.length >= 2, `ways=${r.json?.earnWays?.length}`);

  // 4. 找一件在售商品（挑价格最高的，确保能过积分门槛）
  r = await req('/api/products?limit=60');
  const products = r.json?.products || r.json?.items || [];
  check('拿到在售商品列表', products.length > 0, `count=${products.length}`);
  if (!products.length) return finish();

  // 按价格降序，挑最贵的 —— 门槛测试需要金额足够大
  const sorted = [...products].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  const prod = sorted[0];
  const slug = prod.slug;
  console.log(`   （测试商品：${prod.name} / ${slug} / ₩${prod.price}）\n`);

  // 5. 用积分接口试算（未达门槛应不可用）
  r = await req('/api/account/points/quote', {
    method: 'POST',
    body: JSON.stringify({ items: [{ slug, qty: 1, price: prod.price ?? 100000 }] }),
  });
  check('积分试算接口', r.status === 200 && r.json?.ok === true, `status=${r.status} reason=${r.json?.reason}`);

  // 6. 管理员登录
  const userJar = new Map(jar);
  r = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  });
  check('管理员登录', r.status === 200 && jar.has('ws_session'), `status=${r.status}`);

  // 7. 读取/保存积分规则
  r = await req('/api/admin/points');
  const rule = r.json?.rule;
  check('后台读取积分规则', r.status === 200 && !!rule, `earnPercent=${rule?.earnPercent} minSpend=${rule?.minSpendForUse}`);

  const testRule = {
    enabled: true,
    earnPercent: 10,
    minSpendForUse: 1000,
    pointsPerKrw: 1, // 1 积分 = 1₩，测试方便
    maxUsePercent: 50,
  };
  r = await req('/api/admin/points', { method: 'PUT', body: JSON.stringify(testRule) });
  check('后台保存积分规则', r.status === 200 && r.json?.rule?.earnPercent === 10, `earnPercent=${r.json?.rule?.earnPercent}`);

  // 14b. 把测试商品价格提到门槛以上（不改商品，改用高数量下单）
  const qty = Math.max(1, Math.ceil(2000 / Math.max(1, prod.price ?? 100)));
  console.log(`   （下单数量 ${qty}，金额约 ₩${(prod.price ?? 0) * qty}）\n`);

  // 8. 找用户 id（后台客户列表里找）
  r = await req('/api/admin/customers');
  const cust = (r.json?.customers || []).find((c) => c.email === TEST_USER.email);
  check('后台能查到测试客户', !!cust, cust ? `id=${cust.id}` : '未找到');
  if (!cust) return finish();

  // 9. 手动加积分 100000
  r = await req(`/api/admin/customers/${cust.id}/points`, {
    method: 'POST',
    body: JSON.stringify({ amount: 100000, remark: '自动化测试发放' }),
  });
  check('后台手动增加积分', r.status === 200 && r.json?.balance === 100000, `balance=${r.json?.balance}`);

  // 10. 手动减积分 -1000
  r = await req(`/api/admin/customers/${cust.id}/points`, {
    method: 'POST',
    body: JSON.stringify({ amount: -1000, remark: '自动化测试扣减' }),
  });
  check('后台手动扣减积分', r.status === 200 && r.json?.balance === 99000, `balance=${r.json?.balance}`);

  // 11. 扣成负数应被钳到 0
  r = await req(`/api/admin/customers/${cust.id}/points`, {
    method: 'POST',
    body: JSON.stringify({ amount: -999999999, remark: '超额扣减测试' }),
  });
  check('超额扣减被钳制到 0（不出现负余额）', r.status === 200 && r.json?.balance === 0, `balance=${r.json?.balance}`);

  // 12. 再加回 100000
  r = await req(`/api/admin/customers/${cust.id}/points`, {
    method: 'POST',
    body: JSON.stringify({ amount: 100000, remark: '补回测试额度' }),
  });
  check('补回积分', r.status === 200 && r.json?.balance === 100000, `balance=${r.json?.balance}`);

  // 13. 切回用户身份
  jar.clear();
  for (const [k, v] of userJar) jar.set(k, v);

  // 14. 试算（门槛 1000，应该可用）
  r = await req('/api/account/points/quote', {
    method: 'POST',
    body: JSON.stringify({ items: [{ slug, qty, price: prod.price ?? 100000 }] }),
  });
  check('积分试算：达到门槛可用', r.json?.eligible === true, `maxPoints=${r.json?.maxPoints} maxDiscount=${r.json?.maxDiscount} reason=${r.json?.reason}`);

  // 15. 下单用 1000 积分抵扣
  const usePoints = 1000;
  r = await req('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug, qty, options: {}, size: undefined }],
      shipping: {
        name: TEST_USER.name,
        phone: '010-0000-0000',
        email: TEST_USER.email,
        line1: '测试地址 1 号',
        city: 'Seoul',
        country: 'KR',
        postalCode: '04524',
      },
      usePoints,
    }),
  });
  const order = r.json?.order;
  check('下单成功', r.status === 200 && !!order?.orderNo, `orderNo=${order?.orderNo} total=${order?.total} pointsUsed=${order?.pointsUsed} pointsDiscount=${order?.pointsDiscount}`);
  check('订单记录了使用积分数', order?.pointsUsed === usePoints, `pointsUsed=${order?.pointsUsed}`);
  check('订单记录了积分抵扣金额', order?.pointsDiscount > 0, `pointsDiscount=${order?.pointsDiscount}`);

  // 16. 积分余额已扣减
  r = await req('/api/account/points');
  const afterUse = r.json?.points;
  check('下单后积分余额已扣减', afterUse === 100000 - usePoints, `balance=${afterUse} (期望 ${100000 - usePoints})`);

  // 17. 积分流水有 use 记录
  const useTxn = (r.json?.transactions || []).find((t) => t.type === 'use');
  check('积分流水记录了「下单抵扣」', !!useTxn, useTxn ? `amount=${useTxn.amount}` : '未找到');

  // 18. 切管理员，验证订单详情（后台接口需要 admin 身份）
  jar.clear();
  r = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  });
  check('管理员重新登录', r.status === 200, `status=${r.status}`);

  r = await req(`/api/admin/orders?userId=${cust.id}`);
  const adminOrders = r.json?.orders || [];
  const myOrder = adminOrders.find((o) => o.orderNo === order?.orderNo);
  check('后台订单列表能找到该订单', !!myOrder, myOrder ? `items=${myOrder.items?.length}` : '未找到');
  check(
    '订单行有规格字段 skuLabel',
    !!myOrder?.items?.[0] && 'skuLabel' in myOrder.items[0],
    `skuLabel=${myOrder?.items?.[0]?.skuLabel}`,
  );
  check(
    '后台订单能看到用了多少积分',
    myOrder?.pointsUsed === usePoints && myOrder?.pointsDiscount > 0,
    `pointsUsed=${myOrder?.pointsUsed} pointsDiscount=${myOrder?.pointsDiscount} total=${myOrder?.total}`,
  );

  // 19. 把订单改成 paid → 触发返积分
  r = await req(`/api/admin/orders/${myOrder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'paid' }),
  });
  check('订单改为已支付', r.status === 200 && r.json?.order?.status === 'paid', `status=${r.json?.order?.status}`);

  // 20. 返积分已发放
  r = await req(`/api/admin/orders?userId=${cust.id}`);
  const paidOrder = (r.json?.orders || []).find((o) => o.orderNo === order?.orderNo);
  check('支付后订单记录了赠送积分', (paidOrder?.pointsEarned || 0) > 0, `pointsEarned=${paidOrder?.pointsEarned}`);

  // 21. 切回用户看余额
  jar.clear();
  for (const [k, v] of userJar) jar.set(k, v);
  r = await req('/api/account/points');
  const afterEarn = r.json?.points;
  const expected = 100000 - usePoints + (paidOrder?.pointsEarned || 0);
  check('返积分已到账', afterEarn === expected, `balance=${afterEarn} (期望 ${expected})`);
  const earnTxn = (r.json?.transactions || []).find((t) => t.type === 'earn');
  check('积分流水记录了「消费返积分」', !!earnTxn, earnTxn ? `amount=${earnTxn.amount}` : '未找到');

  // 22. 改成 refunded → 扣回赠送积分 + 退回已用积分
  jar.clear();
  r = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  });
  r = await req(`/api/admin/orders/${myOrder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'refunded' }),
  });
  check('订单改为已退款', r.status === 200 && r.json?.order?.status === 'refunded', `status=${r.json?.order?.status}`);

  jar.clear();
  for (const [k, v] of userJar) jar.set(k, v);
  r = await req('/api/account/points');
  const afterRefund = r.json?.points;
  const expRefund = 100000 - usePoints + (paidOrder?.pointsEarned || 0) - (paidOrder?.pointsEarned || 0) + usePoints;
  check('退款后：赠送积分已扣回、用掉的积分已退回', afterRefund === expRefund, `balance=${afterRefund} (期望 ${expRefund})`);
  const refundTxn = (r.json?.transactions || []).find((t) => t.type === 'refund_deduct');
  check('积分流水记录了「退款扣回」', !!refundTxn, refundTxn ? `amount=${refundTxn.amount}` : '未找到');

  // 23. 重复退款不应重复扣
  jar.clear();
  r = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  });
  await req(`/api/admin/orders/${myOrder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'refunded' }),
  });
  jar.clear();
  for (const [k, v] of userJar) jar.set(k, v);
  r = await req('/api/account/points');
  check('重复退款不会重复扣积分（幂等）', r.json?.points === expRefund, `balance=${r.json?.points}`);

  finish();
}

function finish() {
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n=== 结果：${passed}/${total} 通过 ===`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log('\n失败项：');
    for (const f of failed) console.log(`  ❌ ${f.name} — ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('测试异常：', e);
  finish();
});
