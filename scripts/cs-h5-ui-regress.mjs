// H5 客服台 UI 级验证（Playwright，真实手机视口）
//
// 验证：
//   ① /cs 路由不带语言前缀，纯净全屏（不继承商城顶栏/底栏/浮窗）
//   ② 未登录访问 /cs → 跳登录页
//   ③ 后台创建客服账号 → H5 登录成功 → 进入工作台
//   ④ WS 已连接（顶部显示"已连接"）
//   ⑤ 访客发消息 → H5 列表出现该会话 + 未读红点
//   ⑥ 点开会话 → 红点归零；聊天页正常渲染
//   ⑦ H5 回复 → 访客页面无需刷新即可看到
//   ⑧ 未读数按客服独立：A 读过的会话，B 仍显示未读；A 自己不再显示
//   ⑨ 停用账号后无法登录
import { createRequire } from 'module';
import { loginTestCustomer } from './chat-test-user.mjs';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
try {
  require('dotenv/config');
} catch {
  /* noop */
}

const PW_ROOT =
  'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli';
const { chromium } = require(path.join(PW_ROOT, 'node_modules', 'playwright'));

const CHROME =
  'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1169/chrome-win/chrome.exe';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'cs-h5');
fs.mkdirSync(OUT, { recursive: true });

// iPhone 14 Pro 尺寸
const PHONE = { width: 393, height: 852 };

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 只看会话列表第一行（= 最新会话 = 本次测试创建的会话）的未读红点，
 *  避免历史遗留测试会话的未读数污染断言 */
async function firstRowBadge(page) {
  const row = page.locator('main button').first();
  if (!(await row.count())) return 0;
  return row.locator('span.bg-red-500').count();
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  // ⚠️ 截图会卡在 "waiting for fonts to load" —— 外网 Google Fonts 走本机代理时
  //    经常挂住不放，导致 Playwright 截图超时、整个套件崩在截图那一步。
  //    解决：直接拦掉字体请求（字体加载立刻失败 → settled），截图本身再加超时兜底。
  const blockFonts = (ctx) => {
    ctx.route(/fonts\.(googleapis|gstatic)\.com/i, (route) => route.abort().catch(() => {}));
  };

  // 客服 A：手机视口
  const csCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  blockFonts(csCtx);
  const cs = await csCtx.newPage();
  const csErrors = [];
  cs.on('console', (m) => {
    if (m.type() === 'error') csErrors.push(m.text());
  });

  // 客服 B：独立 context（若共用，A 的 cs_session cookie 会让 B 顶替成 A）
  const csBCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  blockFonts(csBCtx);
  const csB = await csBCtx.newPage();

  // 停用测试：再开一个独立 context
  const csCCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  blockFonts(csCCtx);
  const csC = await csCCtx.newPage();

  // 后台端：桌面视口
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  blockFonts(adminCtx);
  const admin = await adminCtx.newPage();

  // 访客端
  const visitorCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  blockFonts(visitorCtx);
  const visitor = await visitorCtx.newPage();

  const stamp = Date.now();
  const ua = `uia_${stamp}`;
  const ub = `uib_${stamp}`;
  const pwd = 'uitest123';
  // ⚠️ 访客必须已注册登录才能用实时客服（2026-10-29 起）
  const cust = await loginTestCustomer('im');
  const VISITOR_NAME = cust.username;

  try {
    // ---------- ① 路由与布局 ----------
    const res = await cs.goto(`${BASE}/cs`, { waitUntil: 'domcontentloaded' });
    check('①A /cs 可访问（不带语言前缀）', res.status() === 200, `HTTP ${res.status()}`);
    check('①B /cs 最终 URL 是 /cs/login（未登录被拦截）', cs.url().endsWith('/cs/login'), cs.url());

    await cs.waitForTimeout(1200);
    const html = await cs.content();
    // 商城顶栏特征：logo 图片 / 商城内链导航 / 商城购物车账户条；H5 页不应带任何一项
    const mallMarks = ['/brand/jnd-logo', 'href="/ko/products', 'href="/zh/products', 'href="/en/products'];
    const hit = mallMarks.filter((m) => html.includes(m));
    check(
      '①C 纯净全屏：不继承商城顶栏',
      hit.length === 0 && html.includes('상담원 작업대'),
      hit.length ? '命中商城标记: ' + hit.join(',') : '无商城标记，且含 H5 标题'
    );
    await cs.screenshot({ path: path.join(OUT, '01-login.png'), timeout: 15000 }).catch(() => {});

    // ---------- ③ 后台创建账号 ----------
    await admin.goto(`${BASE}/ko/admin/login`, { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(1500);
    await admin.locator('input[placeholder*="아이디"]').first().fill('admin@shop.com');
    await admin.locator('input[type="password"]').first().fill('admin1234');
    await admin.locator('button[type="submit"]').first().click();
    await admin.waitForTimeout(2500);

    // 走 API 建号（后台 UI 建号另有接口级测试覆盖）
    const created = await admin.evaluate(
      async ({ ua, ub, pwd }) => {
        const mk = async (username, displayName) => {
          const r = await fetch('/api/admin/support-agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: pwd, displayName }),
          });
          return { status: r.status, body: await r.json().catch(() => ({})) };
        };
        return { a: await mk(ua, 'UI客服A'), b: await mk(ub, 'UI客服B') };
      },
      { ua, ub, pwd }
    );
    check('③A 后台可创建客服账号', created.a.status === 200 && created.b.status === 200);

    // 后台账号管理页截图
    await admin.goto(`${BASE}/ko/admin/support-agents`, { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(2000);
    const adminHtml = await admin.content();
    check('③B 后台客服账号管理页可打开', adminHtml.includes(ua) && adminHtml.includes(ub));
    // ⚠️ 不用 fullPage：账号列表变长后 fullPage 截图会卡在等字体加载上
    await admin.screenshot({ path: path.join(OUT, '02-admin-agents.png'), timeout: 15000 }).catch(() => {});

    // ---------- ③C H5 登录 ----------
    await cs.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
    await cs.waitForTimeout(1000);
    await cs.locator('input[autocomplete="username"]').first().fill(ua);
    await cs.locator('input[type="password"]').first().fill(pwd);
    await cs.locator('button[type="submit"]').first().click();
    await cs.waitForTimeout(3000);
    check('③C H5 登录成功进入工作台', cs.url().endsWith('/cs'), cs.url());

    // ---------- ④ WS 已连接 ----------
    // ⚠️ dev 模式下 React StrictMode 会双重挂载 → 首次 WS 连接被 cleanup 掐断，
    //    触发退避重连（2s 起）。固定 sleep 判断必然误报 → 必须等「已连接」真的出现。
    const connOk = await cs
      .locator('header')
      .first()
      .getByText('연결됨')
      .waitFor({ timeout: 25000 })
      .then(() => true)
      .catch(() => false);
    const headerText = await cs.locator('header').first().innerText().catch(() => '');
    check('④ 顶部显示已连接', connOk, headerText.replace(/\n/g, ' '));

    // ---------- ⑤ 访客发消息 → H5 列表出现 ----------
    // ⚠️ 先登录（注册走 API，cookie 落到浏览器上下文），再用 ?chat=1 自动打开浮窗
    await visitor.goto(`${BASE}/zh`, { waitUntil: 'domcontentloaded' });
    await visitor.evaluate(
      async ({ account, password }) => {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account, password }),
        });
      },
      { account: cust.username, password: cust.password }
    );
    await visitor.goto(`${BASE}/zh?chat=1`, { waitUntil: 'domcontentloaded' });
    await visitor.waitForTimeout(2500);
    // 未登录会看到「登录/注册」引导；登录后应直接看到「开始对话」
    const startBtn = visitor.locator('button', { hasText: '开始对话' }).first();
    if (await startBtn.count()) {
      await startBtn.click();
      await visitor.waitForTimeout(1800);
    }
    const ta = visitor.locator('textarea').first();
    await ta.fill('H5测试：请问有货吗');
    await visitor.locator('button', { hasText: '发送' }).first().click();
    await visitor.waitForTimeout(3500);

    // 会话列表靠 3 秒轮询刷新，先等列表真的出现
    await cs.locator('main button').first().waitFor({ timeout: 25000 }).catch(() => {});
    const listText = await cs.locator('main').first().innerText().catch(() => '');
    check(
      '⑤A H5 列表出现访客会话',
      listText.includes('H5测试') || listText.includes(VISITOR_NAME),
      listText.slice(0, 120).replace(/\n/g, ' | ')
    );

    const badgeCount = await firstRowBadge(cs);
    check('⑤B 未读红点出现', badgeCount > 0, `当前会话 ${badgeCount} 个红点`);
    await cs.screenshot({ path: path.join(OUT, '03-list-unread.png'), timeout: 15000 }).catch(() => {});

    // ---------- ⑥ 点开会话 → 红点归零 ----------
    await cs.locator('main button').first().click();
    await cs.waitForTimeout(2500);
    const chatText = await cs.locator('body').innerText().catch(() => '');
    check('⑥B 聊天页显示访客消息', chatText.includes('H5测试'), chatText.slice(0, 100).replace(/\n/g, ' | '));
    await cs.screenshot({ path: path.join(OUT, '04-chat-view.png'), timeout: 15000 }).catch(() => {});

    // ---------- ⑦ H5 回复 → 访客免刷新收到 ----------
    const csTa = cs.locator('textarea').first();
    await csTa.fill('有货的，今天下单明天发货');
    // ⚠️ H5 客服台已韩文化 → 发送按钮是「전송」
    await cs.locator('button', { hasText: '전송' }).first().click();
    await cs.waitForTimeout(3000);

    const visitorText = await visitor.locator('body').innerText().catch(() => '');
    check(
      '⑦ 访客页面免刷新收到客服回复',
      visitorText.includes('有货的，今天下单明天发货'),
      visitorText.slice(0, 120).replace(/\n/g, ' | ')
    );
    await visitor.screenshot({ path: path.join(OUT, '05-visitor-got-reply.png'), timeout: 15000 }).catch(() => {});

    // ---------- ⑧ 未读按客服独立 ----------
    // 客服 B 登录（独立 context），B 从未看过这个会话 → 应有未读
    await csB.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
    await csB.waitForTimeout(1200);
    await csB.locator('input[autocomplete="username"]').first().fill(ub);
    await csB.locator('input[type="password"]').first().fill(pwd);
    await csB.locator('button[type="submit"]').first().click();
    await csB.waitForTimeout(3500);
    check('⑧0 客服 B 登录成功', csB.url().endsWith('/cs'), csB.url());

    await csB.waitForTimeout(1500);
    const badgeB = await firstRowBadge(csB);
    check('⑧A 客服 B 从未读过 → 有未读红点', badgeB > 0, `B 当前会话 ${badgeB} 个红点`);

    // 客服 A 已读过该会话 → 返回列表应无红点（B 的未读不受影响）
    await cs.locator('button[aria-label="목록으로"]').first().click();
    await cs.waitForTimeout(2500);
    const badgeA = await firstRowBadge(cs);
    const badgeB2 = await firstRowBadge(csB);
    check('⑧B 客服 A 已读 → 无红点', badgeA === 0, `A 当前会话 ${badgeA} 个红点`);
    check(
      '⑧C 互不影响：A 读过后 B 的未读仍在',
      badgeB2 > 0 && badgeB2 === badgeB,
      `B 之前=${badgeB} 现在=${badgeB2}`
    );
    await csB.screenshot({ path: path.join(OUT, '06-agent-b-unread.png'), timeout: 15000 }).catch(() => {});

    // ---------- ⑨ 停用后无法登录 ----------
    await admin.evaluate(
      async ({ id }) => {
        await fetch(`/api/admin/support-agents/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        });
      },
      { id: created.a.body.agent.id }
    );
    await csC.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
    await csC.waitForTimeout(1000);
    await csC.locator('input[autocomplete="username"]').first().fill(ua);
    await csC.locator('input[type="password"]').first().fill(pwd);
    await csC.locator('button[type="submit"]').first().click();
    await csC.waitForTimeout(2000);
    const errText = await csC.locator('body').innerText().catch(() => '');
    // ⚠️ H5 客服台已韩文化 → 提示是韩文「사용 중지된」
    check('⑨ 停用账号登录被拒绝并提示', /사용 중지된/.test(errText), errText.slice(0, 80).replace(/\n/g, ' '));
    await csC.screenshot({ path: path.join(OUT, '07-disabled-login.png'), timeout: 15000 }).catch(() => {});

    // ---------- 控制台无报错 ----------
    const realErrors = csErrors.filter(
      (e) => !/favicon|Download the React DevTools|ERR_CONNECTION_RESET|Failed to load resource/i.test(e)
    );
    check('⑩ H5 页面无 JS 报错', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));
  } finally {
    // 清理测试数据
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query(`DELETE FROM "ChatConversation" WHERE "visitorName" = $1`, [VISITOR_NAME]);
      await pool.query(`DELETE FROM "ChatReadCursor" WHERE "staffId" LIKE 'agent:%'`);
      await pool.query(`DELETE FROM "ChatAgent" WHERE "username" IN ($1,$2)`, [ua, ub]);
      // 清理测试会员（含其会话）
      await pool.query(
        `DELETE FROM "ChatConversation" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "username" = $1)`,
        [VISITOR_NAME]
      );
      await pool.query(`DELETE FROM "User" WHERE "username" = $1`, [VISITOR_NAME]);
      await pool.end();
    } catch {
      /* noop */
    }
    await browser.close();
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n=== 结果：${pass}/${results.length} 通过${fail ? `，${fail} 项失败` : ''} ===`);
  if (fail) {
    results.filter((r) => !r.ok).forEach((r) => console.log(`   ❌ ${r.name} — ${r.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('测试异常:', e);
  process.exit(1);
});
