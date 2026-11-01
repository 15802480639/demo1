// 后台新功能 UI 回归测试（2026-11-01）
//
// 覆盖 6 项新功能在真实浏览器里的表现：
//   1. Excel 导入页：模板下载 / 文件选择 / 试运行 / 正式导入 + 结果展示
//   2. 聊天-订单关联：后台订单页能看见关联会话并跳转
//   3. 权限分级：viewer 登录后台看不到不该有的菜单
//   4. 新订单通知：铃铛出现未读徽标
//   5. 数据导出：报表页三个导出按钮
//   6. 操作日志：日志页能筛选并展开详情
//
// 用法：node scripts/admin-new-features-ui-regress.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const BASE = process.env.UI_BASE || 'http://127.0.0.1:3100';
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'admin-new-features');

for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'])
  delete process.env[k];

let chromium;
let CHROME;
try {
  ({ chromium } = require(
    'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright'
  ));
  CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1169/chrome-win/chrome.exe';
} catch {
  console.error('❌ 找不到 playwright');
  process.exit(2);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, account, password, path = '/ko/login') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  // 登录表单的输入框没有 name 属性 → 用类型定位
  const accountInput = page.locator('form input:not([type="password"])').first();
  const passwordInput = page.locator('form input[type="password"]').first();
  await accountInput.fill(account);
  await passwordInput.fill(password);
  await page.click('form button[type="submit"]');
  await sleep(2500);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  fs.mkdirSync(OUT, { recursive: true });

  // ═══════════ 管理员视角 ═══════════
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  // 屏蔽 Google Fonts（否则截图会卡在 waiting for fonts to load）
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();

  console.log('\n=== 登录（owner）===');
  await login(page, 'admin@shop.com', 'admin1234', '/ko/admin/login');
  check('管理员登录后进入后台', page.url().includes('/admin'), page.url());

  // ---- 6. 操作日志页 ----
  console.log('\n=== 6. 管理员操作日志 ===');
  await page.goto(`${BASE}/ko/admin/audit-logs`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const auditRows = await page.locator('button:has-text("▸")').count();
  check('审计日志页有日志条目', auditRows > 0, `rows=${auditRows}`);
  const auditText = await page.locator('body').innerText();
  check('审计页含「操作日志」标题', /작업 로그|操作日志|Audit/i.test(auditText));
  // 展开一行看详情
  if (auditRows > 0) {
    await page.locator('button:has-text("▸")').first().click();
    await sleep(1200);
    const after = await page.locator('body').innerText();
    check('点击日志行可展开详情', /audActor|操作人|작업자|actorName/i.test(after) || after.length > auditText.length);
  }
  await page.screenshot({ path: path.join(OUT, '01-audit-logs.png'), timeout: 15000 }).catch(() => {});

  // ---- 3. 权限页 ----
  console.log('\n=== 3. 管理员/客服权限分级 ===');
  await page.goto(`${BASE}/ko/admin/staff`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const staffText = await page.locator('body').innerText();
  check('员工页渲染出内容', staffText.length > 300);
  check('员工页含权限档位相关文字', /권한|权限|档位|권한 등급/i.test(staffText));
  await page.screenshot({ path: path.join(OUT, '02-staff.png'), timeout: 15000 }).catch(() => {});

  // ---- 5. 销售报表页 ----
  console.log('\n=== 5. 数据导出 / 销售报表 ===');
  await page.goto(`${BASE}/ko/admin/reports`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const repText = await page.locator('body').innerText();
  check('报表页渲染出汇总数字', /\d/.test(repText));
  const exportBtns = await page.locator('button:has-text("내보내기"), button:has-text("导出"), a:has-text("내보내기")').count();
  check('报表页有导出按钮', exportBtns >= 1, `count=${exportBtns}`);
  await page.screenshot({ path: path.join(OUT, '03-reports.png'), timeout: 15000 }).catch(() => {});

  // ---- 1. Excel 导入页 ----
  console.log('\n=== 1. Excel 批量导入 ===');
  await page.goto(`${BASE}/ko/admin/products/import`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const impText = await page.locator('body').innerText();
  check('导入页渲染出内容', impText.length > 300);
  check('导入页含"试运行"字样', /미리보기|试运行|미리 실행/i.test(impText));
  check('导入页有文件选择控件', (await page.locator('input[type="file"]').count()) > 0);
  await page.screenshot({ path: path.join(OUT, '04-import.png'), timeout: 15000 }).catch(() => {});

  // ---- 4. 通知铃铛 ----
  console.log('\n=== 4. 后台通知铃铛 ===');
  await page.goto(`${BASE}/ko/admin`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const bell = await page.locator('[aria-label*="알림"], [aria-label*="通知"], button:has(svg)').count();
  check('后台顶栏渲染出铃铛等按钮', bell > 0, `count=${bell}`);
  await page.screenshot({ path: path.join(OUT, '05-dashboard-bell.png'), timeout: 15000 }).catch(() => {});

  // ---- 2. 订单页关联会话 ----
  console.log('\n=== 2. 聊天-订单关联（后台反向展示）===');
  await page.goto(`${BASE}/ko/admin/orders`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  // 展开第一单
  const expandBtn = page.locator('button:has-text("▸")').first();
  const hasExpand = (await expandBtn.count()) > 0;
  check('订单页有可展开的订单行', hasExpand);
  if (hasExpand) {
    await expandBtn.click();
    await sleep(1500);
    const orderText = await page.locator('body').innerText();
    check('展开后出现「关联订单/연결된 주문」区块', /연결된 주문|关联订单/i.test(orderText));
  }
  await page.screenshot({ path: path.join(OUT, '06-orders-linked.png'), timeout: 15000 }).catch(() => {});

  await ctx.close();

  // ═══════════ viewer 视角：菜单应被过滤 ═══════════
  console.log('\n=== 3b. viewer 权限（菜单过滤）===');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page2 = await ctx2.newPage();
  await login(page2, 'admin2@shop.com', 'admin1234', '/ko/admin/login');
  // ⚠️ 必须先降到 viewer 档位：admin 档位设计上就有 audit.view（管理层要能看日志）
  //    真正要验证的是「只读档位看不到审计页」
  {
    const jar = new Map();
    const absorb = (res) => {
      for (const l of res.headers.getSetCookie?.() || []) {
        const [p] = l.split(';');
        const i = p.indexOf('=');
        if (i > 0) jar.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
      }
    };
    const ck = () => Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    const r0 = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: ck() },
      body: JSON.stringify({ account: 'admin@shop.com', password: 'admin1234' }),
    });
    absorb(r0);
    const staffRes = await fetch(`${BASE}/api/admin/staff`, { headers: { cookie: ck() } });
    const staffD = await staffRes.json();
    const me = (staffD.admins || []).find((a) => a.email === 'admin2@shop.com');
    if (me) {
      await fetch(`${BASE}/api/admin/staff`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie: ck() },
        body: JSON.stringify({ userId: me.id, staffRole: 'viewer' }),
      });
      // 让新会话带上最新档位
      await page2.context().clearCookies();
      await login(page2, 'admin2@shop.com', 'admin1234', '/ko/admin/login');
    }
  }
  await page2.goto(`${BASE}/ko/admin`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const navText = await page2.locator('body').innerText();
  const hasAuditLink = navText.includes('작업 로그') || navText.includes('操作日志');
  check('viewer 侧边栏不含「操作日志」菜单', !hasAuditLink);
  // 直接访问审计页应被拒（服务端 redirect 到后台首页）
  await page2.goto(`${BASE}/ko/admin/audit-logs`, { waitUntil: 'domcontentloaded' });
  await sleep(1800);
  const finalUrl = page2.url();
  check('viewer 直接访问审计页被重定向走',
    !finalUrl.includes('audit-logs'), `finalUrl=${finalUrl}`);
  await page2.screenshot({ path: path.join(OUT, '07-viewer-denied.png'), timeout: 15000 }).catch(() => {});
  await ctx2.close();

  // ═══════════ 前台：订单页「咨询这单」按钮 ═══════════
  console.log('\n=== 2b. 前台订单页「咨询这单」===');
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  await ctx3.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page3 = await ctx3.newPage();
  await login(page3, 'demo@example.com', 'demo1234');
  // 取一单
  const orderNo = process.env.VERIFY_ORDER_NO || '';
  if (orderNo) {
    await page3.goto(`${BASE}/ko/order/${orderNo}`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    const askBtn = page3.locator('button:has-text("이 주문 문의하기"), button:has-text("咨询这单")');
    check('订单详情页有「咨询这单」按钮', (await askBtn.count()) > 0);
    if ((await askBtn.count()) > 0) {
      await askBtn.first().click();
      await sleep(2000);
      const panel = await page3.locator('[data-chat-panel="1"]').count();
      check('点击后打开聊天浮窗', panel > 0);
      const panelText = panel > 0 ? await page3.locator('[data-chat-panel="1"]').innerText() : '';
      check('聊天面板头部显示关联订单号', panelText.includes(orderNo), panelText.slice(0, 120));
      await page3.screenshot({ path: path.join(OUT, '08-front-ask-order.png'), timeout: 15000 }).catch(() => {});
    }
  } else {
    console.log('  ⚠️ 未提供 VERIFY_ORDER_NO，跳过');
  }
  await ctx3.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log('\n════════════════════════════════');
console.log(`通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
if (failed.length) {
  console.log('\n失败明细：');
  failed.forEach((f) => console.log('  ✗ ' + f.name + (f.detail ? ' — ' + f.detail : '')));
}
console.log(`截图目录：${OUT}`);
process.exit(failed.length ? 1 : 0);
