/**
 * 本地端到端验证：6 项新功能
 *   1. Excel 批量导入商品/价格/库存
 *   2. 聊天记录关联订单（访客发起 + 客服手动 + 后台反向展示）
 *   3. 管理员/客服权限分级
 *   4. 新订单后台通知
 *   5. 数据导出（订单/会员/销售报表）
 *   6. 管理员操作日志
 *
 * 用法：node scripts/verify-new-features.mjs
 * 依赖：本地 dev server 跑在 3100，管理员 admin@shop.com / admin1234
 */
import ExcelJS from 'exceljs';

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:3100';
const ADMIN = { account: 'admin@shop.com', password: 'admin1234' };

let pass = 0;
let fail = 0;
const failures = [];
/** 第一个订单的 id（供权限测试用） */
let firstOrderId = '';

function ok(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` — ${extra}` : ''));
    console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

/** 简易 cookie jar */
function makeJar() {
  const map = new Map();
  return {
    map,
    header: () => Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; '),
    absorb(res) {
      const sc = res.headers.getSetCookie?.() || [];
      for (const line of sc) {
        const [pair] = line.split(';');
        const idx = pair.indexOf('=');
        if (idx > 0) map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      }
    },
  };
}

async function req(jar, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const cookie = jar.header();
  if (cookie) headers.cookie = cookie;
  if (opts.json !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    redirect: 'manual',
  });
  jar.absorb(res);
  return res;
}

async function login(jar, creds) {
  const res = await req(jar, '/api/auth/login', { method: 'POST', json: creds });
  const d = await res.json().catch(() => ({}));
  return { res, d };
}

// ════════════════════════════════════════════════
// 0. 管理员登录
// ════════════════════════════════════════════════
section('0. 管理员登录');
const admin = makeJar();
{
  const { res, d } = await login(admin, ADMIN);
  ok('管理员登录成功', res.ok && d.ok === true, `HTTP ${res.status} ${JSON.stringify(d).slice(0, 100)}`);
  ok('返回 staffRole', !!d.user?.staffRole, `staffRole=${d.user?.staffRole}`);
}

// ════════════════════════════════════════════════
// 6. 管理员操作日志
// ════════════════════════════════════════════════
section('6. 管理员操作日志');
{
  // 先产生一条日志（改一个订单状态 —— 必须真的变化才会记）
  const ordersRes = await req(admin, '/api/admin/orders');
  const ordersD = await ordersRes.json();
  const order = (ordersD.orders || [])[0];
  ok('后台订单列表可访问且有数据', !!order, `count=${ordersD.orders?.length}`);
  if (order) {
    firstOrderId = order.id;
    const next = order.status === 'paid' ? 'pending' : 'paid';
    const pr1 = await req(admin, `/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      json: { status: next },
    });
    ok('订单状态变更接口可访问', pr1.status === 200, `HTTP ${pr1.status}`);
    // 再改物流（一定产生日志）
    await req(admin, `/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      json: { trackingNo: 'TEST-TRACK-001', carrier: 'CJ' },
    });
  }
  const r = await req(admin, '/api/admin/audit-logs?limit=50');
  const d = await r.json();
  ok('审计日志接口可访问', r.status === 200, `HTTP ${r.status}`);
  ok('日志列表非空', Array.isArray(d.logs) && d.logs.length > 0, `count=${d.logs?.length}`);
  const hasOrderAction = (d.logs || []).some((l) => String(l.action).includes('order'));
  ok('含订单相关操作记录', hasOrderAction, (d.logs || []).map((l) => l.action).join(','));
  ok('日志含操作人与摘要', !!(d.logs || [])[0]?.actorName && !!(d.logs || [])[0]?.summary,
    JSON.stringify((d.logs || [])[0] || {}).slice(0, 200));
  ok('日志含变更前后值（detail）', !!(d.logs || [])[0]?.detail &&
    Object.keys(d.logs[0].detail || {}).length > 0, JSON.stringify((d.logs || [])[0]?.detail));
  ok('返回操作人列表供筛选', Array.isArray(d.actors));
  // 筛选
  const rf = await req(admin, '/api/admin/audit-logs?targetType=order');
  const df = await rf.json();
  ok('按 targetType 筛选可用', rf.status === 200 && (df.logs || []).every((l) => l.targetType === 'order'),
    `count=${df.logs?.length}`);
}

// ════════════════════════════════════════════════
// 4. 新订单后台通知
// ════════════════════════════════════════════════
section('4. 新订单后台通知');
{
  const r = await req(admin, '/api/admin/notifications');
  const d = await r.json();
  ok('通知接口可访问', r.status === 200, `HTTP ${r.status}`);
  ok('返回通知数组', Array.isArray(d.notifications ?? d), JSON.stringify(d).slice(0, 120));
  // 标已读
  const rp = await req(admin, '/api/admin/notifications', { method: 'POST', json: {} });
  const dp = await rp.json();
  ok('标记已读可用', rp.status === 200 && dp.ok === true, JSON.stringify(dp).slice(0, 100));
}

// ════════════════════════════════════════════════
// 5. 数据导出（订单/会员/销售报表）
// ════════════════════════════════════════════════
section('5. 数据导出');
{
  for (const type of ['orders', 'customers', 'sales']) {
    const r = await req(admin, `/api/admin/export?type=${type}&range=all`);
    const buf = Buffer.from(await r.arrayBuffer());
    const isXlsx = buf[0] === 0x50 && buf[1] === 0x4b; // PK zip 头
    ok(`导出 ${type} 为合法 xlsx`, r.status === 200 && isXlsx, `HTTP ${r.status} size=${buf.length} head=${buf.slice(0, 2).toString('hex')}`);
  }
  // 销售报表 API
  const rs = await req(admin, '/api/admin/reports/sales?range=30d');
  const ds = await rs.json();
  ok('销售报表 API 可访问', rs.status === 200, `HTTP ${rs.status}`);
  ok('报表含每日聚合', Array.isArray(ds.days) || Array.isArray(ds.rows), Object.keys(ds).join(','));
}

// ════════════════════════════════════════════════
// 1. Excel 批量导入商品/价格/库存
// ════════════════════════════════════════════════
section('1. Excel 批量导入商品/价格/库存');
{
  // 模板下载
  const rt = await req(admin, '/api/admin/products/import');
  const tbuf = Buffer.from(await rt.arrayBuffer());
  const isXlsx = tbuf[0] === 0x50 && tbuf[1] === 0x4b;
  ok('导入模板可下载', rt.status === 200 && isXlsx, `HTTP ${rt.status} size=${tbuf.length}`);

  // 构造导入文件（新建商品必须填分类）
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Products');
  ws.addRow([
    'slug', 'name', 'nameZh', 'category', 'brand',
    'price', 'compareAtPrice', 'stock',
    'color', 'size', 'skuCode',
  ]);
  const slug = 'verify-import-' + Date.now();
  ws.addRow([slug, 'Verify Import Item', '验证导入商品', 'men', 'j-d', '19900', '15900', '7', 'Black', 'M', 'VM-BM']);
  ws.addRow([slug, 'Verify Import Item', '验证导入商品', '', '', '', '', '', 'White', 'L', 'VM-WL']);
  const buf = await wb.xlsx.writeBuffer();

  // 试运行
  const fd = new FormData();
  fd.append('file', new Blob([buf]), 'verify.xlsx');
  fd.append('dryRun', '1');
  const rd = await req(admin, '/api/admin/products/import', { method: 'POST', body: fd });
  const dd = await rd.json();
  ok('试运行导入接口可访问', rd.status === 200, `HTTP ${rd.status} ${JSON.stringify(dd).slice(0, 200)}`);
  ok('试运行不写库（识别为新建 1 个商品）', dd.created === 1 && dd.failed === 0,
    `created=${dd.created} failed=${dd.failed} ${JSON.stringify(dd.errors)}`);
  ok('试运行标记 dryRun', dd.dryRun === true);

  // 正式导入
  const fd2 = new FormData();
  fd2.append('file', new Blob([buf]), 'verify.xlsx');
  const r2 = await req(admin, '/api/admin/products/import', { method: 'POST', body: fd2 });
  const d2 = await r2.json();
  ok('正式导入成功', r2.status === 200 && d2.ok === true && d2.created === 1,
    `HTTP ${r2.status} ${JSON.stringify(d2).slice(0, 250)}`);

  // 校验导入后的商品与 SKU
  const rp = await req(admin, '/api/admin/products');
  const dp = await rp.json();
  const list = dp.products || dp.items || [];
  const found = list.find((p) => p.slug === slug);
  ok('导入后商品可查到（slug 按表里填的值生成）', !!found, `list=${list.length} slug=${slug}`);
  ok('只导入出 1 个商品（2 行同 slug 合并）',
    list.filter((p) => p.name === 'Verify Import Item').length === 1,
    `count=${list.filter((p) => p.name === 'Verify Import Item').length}`);
  if (found) {
    ok('导入价格正确', Number(found.price) === 19900, `price=${found.price}`);
    ok('导入划线价正确', Number(found.compareAtPrice) === 15900, `compareAtPrice=${found.compareAtPrice}`);
    const skus = found.skus || found.variants || [];
    ok('导入生成 2 个 SKU', skus.length === 2, `skus=${skus.length}`);
    if (skus.length === 2) {
      const opt = (s) => {
        try { return JSON.parse(s.options || '{}'); } catch { return s.options || {}; }
      };
      ok('SKU 颜色尺码正确',
        skus.some((s) => opt(s).Color === 'Black' && opt(s).Size === 'M') &&
        skus.some((s) => opt(s).Color === 'White' && opt(s).Size === 'L'),
        JSON.stringify(skus.map((s) => opt(s))));
      ok('SKU 库存正确', skus.find((s) => opt(s).Color === 'Black')?.stock === 7,
        JSON.stringify(skus.map((s) => s.stock)));
    }
  }

  // ⭐ 重复导入同一份表 → 应「更新」而不是新建重复商品
  {
    const fd3 = new FormData();
    fd3.append('file', new Blob([buf]), 'verify.xlsx');
    const r3 = await req(admin, '/api/admin/products/import', { method: 'POST', body: fd3 });
    const d3 = await r3.json();
    ok('重复导入识别为「更新」', r3.status === 200 && d3.updated === 1 && d3.created === 0,
      `HTTP ${r3.status} ${JSON.stringify(d3).slice(0, 200)}`);
    const rp2 = await req(admin, '/api/admin/products');
    const dp2 = await rp2.json();
    const dup = (dp2.products || []).filter((p) => p.name === 'Verify Import Item');
    ok('重复导入没有产生重复商品', dup.length === 1, `count=${dup.length}`);
  }

  // 清理：删除导入的商品
  if (found) {
    await req(admin, `/api/admin/products/${found.id}`, { method: 'DELETE' });
    const rd2 = await req(admin, '/api/admin/products?q=' + encodeURIComponent(slug));
    const dd2 = await rd2.json();
    const left = (dd2.products || []).find((p) => p.slug === slug);
    ok('导入商品可删除（清理完成）', !left);
  }
}

// ════════════════════════════════════════════════
// 3. 管理员/客服权限分级
// ════════════════════════════════════════════════
section('3. 管理员/客服权限分级');
{
  // 管理员列表 + 客服列表
  const rs = await req(admin, '/api/admin/staff');
  const ds = await rs.json();
  ok('员工列表接口可访问', rs.status === 200, `HTTP ${rs.status}`);
  ok('返回管理员列表', Array.isArray(ds.admins), Object.keys(ds).join(','));
  ok('返回客服列表', Array.isArray(ds.agents));

  // 调整管理员权限档位
  const target = (ds.admins || []).find((a) => a.email === 'admin2@shop.com');
  if (target) {
    const r = await req(admin, '/api/admin/staff', {
      method: 'PUT',
      json: { userId: target.id, staffRole: 'viewer' },
    });
    const d = await r.json();
    ok('调整权限档位接口可用', r.status === 200, `HTTP ${r.status} ${JSON.stringify(d).slice(0, 150)}`);
    const r2 = await req(admin, '/api/admin/staff');
    const d2 = await r2.json();
    const changed = (d2.admins || []).find((a) => a.id === target.id);
    ok('权限档位已生效', changed?.staffRole === 'viewer', `staffRole=${changed?.staffRole}`);

    // 🔴 防锁死：owner 不能把自己降级（否则再没人能改回来）
    const meOwner = (d2.admins || []).find((a) => a.email === 'admin@shop.com');
    const rSelf = await req(admin, '/api/admin/staff', {
      method: 'PUT',
      json: { userId: meOwner.id, staffRole: 'viewer' },
    });
    ok('owner 自我降级被拒（防永久锁死）', rSelf.status === 400,
      `HTTP ${rSelf.status} ${JSON.stringify(await rSelf.json().catch(() => ({})))}`);

    // 还原
    await req(admin, '/api/admin/staff', {
      method: 'PUT',
      json: { userId: target.id, staffRole: target.staffRole || 'owner' },
    });
  } else {
    console.log('  ⚠️ 没有第二个管理员，跳过档位调整测试');
  }

  // 权限拦截：无 audit.view 的人调审计接口应 403
  // 用普通会员账号测
  const guest = makeJar();
  const g = await login(guest, { account: 'demo@example.com', password: 'demo1234' });
  ok('会员账号可登录', g.res.ok, `HTTP ${g.res.status} ${JSON.stringify(g.d).slice(0, 100)}`);
  if (g.res.ok) {
    const r = await req(guest, '/api/admin/audit-logs');
    ok('普通会员访问审计接口被拒', r.status === 403, `HTTP ${r.status}`);
    const r2 = await req(guest, '/api/admin/export?type=orders');
    ok('普通会员访问导出接口被拒', r2.status === 403, `HTTP ${r2.status}`);
    const r3 = await req(guest, '/api/admin/notifications');
    ok('普通会员访问通知接口被拒', r3.status === 403, `HTTP ${r3.status}`);
    const r4 = await req(guest, '/api/admin/staff');
    ok('普通会员访问员工列表被拒', r4.status === 403, `HTTP ${r4.status}`);
  }

  // 低权限管理员（viewer）应看不到审计日志 / 导出
  const viewer = makeJar();
  const v = await login(viewer, { account: 'admin2@shop.com', password: 'admin1234' });
  ok('第二个管理员可登录', v.res.ok, `HTTP ${v.res.status}`);
  if (v.res.ok) {
    const rs0 = await req(admin, '/api/admin/staff');
    const ds0 = await rs0.json();
    const me = (ds0.admins || []).find((a) => a.email === 'admin2@shop.com');
    ok('管理员权限档位可读', !!me, `staffRole=${me?.staffRole}`);

    if (me) {
      // 改成 viewer → 审计/导出/改单全禁
      await req(admin, '/api/admin/staff', { method: 'PUT', json: { userId: me.id, staffRole: 'viewer' } });
      const rv = await req(viewer, '/api/admin/audit-logs');
      ok('viewer 访问审计接口被拒', rv.status === 403, `HTTP ${rv.status}`);
      const rv2 = await req(viewer, '/api/admin/export?type=orders');
      ok('viewer 访问导出接口被拒', rv2.status === 403, `HTTP ${rv2.status}`);
      const rv3 = await req(viewer, '/api/admin/orders');
      ok('viewer 可读订单列表（只读档位）', rv3.status === 200, `HTTP ${rv3.status}`);
      const rv4 = await req(viewer, `/api/admin/orders/${firstOrderId}`, { method: 'PATCH', json: { status: 'paid' } });
      ok('viewer 改订单被拒', rv4.status === 403, `HTTP ${rv4.status}`);
      // 还原
      await req(admin, '/api/admin/staff', { method: 'PUT', json: { userId: me.id, staffRole: me.staffRole || 'owner' } });
      const rr = await req(admin, '/api/admin/staff');
      const dr = await rr.json();
      const restored = (dr.admins || []).find((a) => a.id === me.id);
      ok('权限档位可还原', restored?.staffRole === (me.staffRole || 'owner'), `staffRole=${restored?.staffRole}`);
    }
  }
}

// ════════════════════════════════════════════════
// 2. 聊天记录关联订单
// ════════════════════════════════════════════════
section('2. 聊天记录关联订单');
{
  // 会员账号 + 已有订单
  const cust = makeJar();
  const cu = await login(cust, { account: 'demo@example.com', password: 'demo1234' });
  ok('会员登录成功', cu.res.ok, `HTTP ${cu.res.status}`);
  let orderNo = null;
  if (cu.res.ok) {
    // 会员订单（前台是服务端渲染，没有 GET 接口 → 直接查库拿）
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    const custRow = await db.user.findUnique({ where: { email: 'demo@example.com' }, select: { id: true } });
    const myOrders = await db.order.findMany({
      where: { userId: custRow.id },
      select: { orderNo: true },
      orderBy: { createdAt: 'desc' },
    });
    await db.$disconnect();
    orderNo = myOrders[0]?.orderNo || null;
    ok('会员订单可查（测试库直查）', !!orderNo, `count=${myOrders.length}`);

    if (!orderNo) {
      console.log('  ⚠️ 会员无订单，跳过聊天关联测试');
    } else {
      // 建会话时带 orderNo
      const rc = await req(cust, '/api/chat/conversations', {
        method: 'POST',
        json: { contactType: 'none', locale: 'ko', orderNo },
      });
      const cd = await rc.json().catch(() => ({}));
      ok('建会话时带订单号', rc.status === 200 && !!cd.id, `HTTP ${rc.status} ${JSON.stringify(cd).slice(0, 150)}`);
      const convId = cd.id;
      const guest = cd.guestToken;

      if (convId) {
        // 查会话 → 订单信息应回传
        const rg = await req(cust, `/api/chat/conversations/${convId}?guest=${encodeURIComponent(guest)}`);
        const gd = await rg.json();
        ok('会话回传关联订单', gd.conversation?.order?.orderNo === orderNo,
          `order=${JSON.stringify(gd.conversation?.order)}`);
        ok('关联订单带金额', gd.conversation?.order?.total != null,
          `total=${gd.conversation?.order?.total}`);

        // 客服侧（admin）看会话列表 → 应带订单
        const ra = await req(admin, '/api/chat/conversations');
        const ad = await ra.json();
        const cv = (ad.conversations || []).find((c) => c.id === convId);
        ok('客服会话列表带关联订单', cv?.order?.orderNo === orderNo, `order=${JSON.stringify(cv?.order)}`);

        // 客服手动改挂到别的订单 → 应被拒（订单不存在）
        const ro2 = await req(admin, `/api/chat/conversations/${convId}`, {
          method: 'PATCH',
          json: { orderNo: 'NOT-EXIST-ORDER' },
        });
        ok('客服挂不存在的订单被拒', ro2.status === 404, `HTTP ${ro2.status}`);

        // 解除关联
        const ru = await req(admin, `/api/chat/conversations/${convId}`, {
          method: 'PATCH',
          json: { orderNo: '' },
        });
        const ud = await ru.json().catch(() => ({}));
        ok('客服可解除订单关联', ru.status === 200 && ud.order === null, `HTTP ${ru.status} ${JSON.stringify(ud).slice(0, 120)}`);

        // 重新关联
        const rl = await req(admin, `/api/chat/conversations/${convId}`, {
          method: 'PATCH',
          json: { orderNo },
        });
        const ldd = await rl.json().catch(() => ({}));
        ok('客服可手动挂回订单', rl.status === 200 && ldd.order?.orderNo === orderNo, `HTTP ${rl.status}`);

        // 后台订单页反查：订单 → 会话
        const ro3 = await req(admin, '/api/admin/orders');
        const od3 = await ro3.json();
        const ord = (od3.orders || []).find((o) => o.orderNo === orderNo);
        ok('后台订单列表含关联会话', !!ord && Array.isArray(ord.conversations) && ord.conversations.some((c) => c.id === convId),
          `convs=${JSON.stringify(ord?.conversations)}`);

        // 访客不能把别人的订单挂到自己的会话
        const rx = await req(cust, `/api/chat/conversations/${convId}?guest=${encodeURIComponent(guest)}`, {
          method: 'PATCH',
          json: { orderNo: 'SOMEONE-ELSE-ORDER' },
        });
        ok('访客挂不存在的订单被拒', rx.status === 404, `HTTP ${rx.status}`);

        // 访客未登录不能建会话
        const anon = makeJar();
        const rAnon = await req(anon, '/api/chat/conversations', {
          method: 'POST',
          json: { contactType: 'none', locale: 'ko', orderNo },
        });
        ok('未登录建会话被拒（401）', rAnon.status === 401, `HTTP ${rAnon.status}`);
      }
    }
  }
}

console.log('\n════════════════════════════════');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
if (failures.length) {
  console.log('\n失败明细：');
  failures.forEach((f) => console.log('  ✗ ' + f));
}
process.exit(fail > 0 ? 1 : 0);
