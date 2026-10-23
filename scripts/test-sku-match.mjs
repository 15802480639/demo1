/**
 * 多规格商品 SKU 匹配实测。
 *
 * 验证修复前的老 bug：matchSku 只比 options.Size === size，
 * 而 size 是「颜色:黑色 / 尺码:M」拼接串 → 永远匹配不上 → 一律退回 skus[0]，
 * 结果扣错库存、算错价格、订单详情没有尺码颜色。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const jar = new Map();
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size) headers.Cookie = cookieHeader();
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' });
  for (const c of res.headers.getSetCookie?.() || []) {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const u = `sk${String(Date.now()).slice(-8)}`;
  await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: u, email: `${u}@t.com`, password: 'Test1234!', name: 'SKU测试' }),
  });
  await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: u, password: 'Test1234!' }),
  });

  // 找一个有颜色+尺码多 SKU 的在售商品
  const prod = await prisma.product.findFirst({
    where: { status: 'active', skus: { some: {} } },
    include: { skus: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!prod) { console.log('❌ 没找到带 SKU 的在售商品'); return; }
  console.log(`\n测试商品：${prod.name} / ${prod.slug}（${prod.skus.length} 个规格）`);
  for (const s of prod.skus) console.log(`  ${s.skuCode} | ${s.options} | stock=${s.stock}`);

  // 挑一个「不是第一个」的 SKU —— 修复前会退回 skus[0]，正好能暴露 bug
  const pick = prod.skus.find((s) => s.stock > 0 && s.id !== prod.skus[0].id) || prod.skus[1];
  if (!pick) { console.log('❌ SKU 数量不足'); return; }
  const opts = JSON.parse(pick.options);
  console.log(`\n选中规格：${pick.skuCode} → ${JSON.stringify(opts)}`);
  console.log(`（注意：这不是第一个 SKU，修复前的 bug 会退回到 ${prod.skus[0].skuCode}）\n`);

  const before = Object.fromEntries(prod.skus.map((s) => [s.id, s.stock]));

  // 只传 options（这是前端购物车里存的值）
  const res = await req('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug: prod.slug, qty: 1, options: opts }],
      shipping: {
        name: 'SKU测试', phone: '010-1111-1111', email: `${u}@t.com`,
        line1: '测试地址', city: 'Seoul', country: 'KR', postalCode: '04524',
      },
    }),
  });
  check('下单成功', res.status === 200 && !!res.json?.order?.orderNo, `orderNo=${res.json?.order?.orderNo}`);
  if (res.json?.error) { console.log('error=', res.json.error); return; }

  // 库存扣减验证
  const after = await prisma.product.findUnique({
    where: { id: prod.id },
    include: { skus: true },
  });
  const picked = after.skus.find((s) => s.id === pick.id);
  const others = after.skus.filter((s) => s.id !== pick.id);
  const wronglyDeducted = others.filter((s) => s.stock !== before[s.id]);

  check(
    '选中的 SKU 库存正确扣减 1',
    picked.stock === before[pick.id] - 1,
    `${before[pick.id]} → ${picked.stock}`,
  );
  check(
    '其它 SKU 库存未被误扣',
    wronglyDeducted.length === 0,
    wronglyDeducted.length ? `误扣: ${wronglyDeducted.map((s) => s.skuCode).join(', ')}` : '全部未动',
  );

  // 订单快照验证
  const order = await prisma.order.findUnique({
    where: { orderNo: res.json.order.orderNo },
    include: { items: true },
  });
  const item = order.items[0];
  console.log(`\n订单行快照：`);
  console.log(`  skuId    = ${item.skuId}`);
  console.log(`  options  = ${item.options}`);
  console.log(`  skuLabel = ${item.skuLabel}`);
  console.log(`  期望 skuId = ${pick.id}`);

  check('订单行快照的 skuId 是选中的那个 SKU', item.skuId === pick.id, `${item.skuId}`);
  check('订单行存了规格快照 options', !!item.options && /Size|사이즈/i.test(item.options), `${item.options}`);
  check('订单行存了可读规格 skuLabel', !!item.skuLabel && item.skuLabel.includes(':'), `${item.skuLabel}`);
  check(
    'skuLabel 同时含颜色和尺码（中文字段名）',
    !!item.skuLabel && /颜色|색상/i.test(item.skuLabel) && /尺码|사이즈/i.test(item.skuLabel),
    `${item.skuLabel}`,
  );

  // 后台订单详情能看到规格
  jar.clear();
  await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@shop.com', password: 'admin1234' }),
  });
  const adminOrders = await req(`/api/admin/orders?userId=${order.userId}`);
  const ao = (adminOrders.json?.orders || []).find((o) => o.orderNo === order.orderNo);
  check('后台订单详情能拿到 skuLabel', !!ao?.items?.[0]?.skuLabel, `${ao?.items?.[0]?.skuLabel}`);

  // 清理测试订单与测试用户
  await prisma.order.delete({ where: { orderNo: order.orderNo } });
  await prisma.user.delete({ where: { id: order.userId } }).catch(() => {});
  console.log('\n（测试订单与用户已清理）');
}

main()
  .catch((e) => console.error('异常：', e))
  .finally(async () => {
    const passed = results.filter((r) => r.ok).length;
    console.log(`\n=== 结果：${passed}/${results.length} 通过 ===`);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      console.log('\n失败项：');
      for (const f of failed) console.log(`  ❌ ${f.name} — ${f.detail}`);
    }
    await prisma.$disconnect();
    process.exit(failed.length ? 1 : 0);
  });
