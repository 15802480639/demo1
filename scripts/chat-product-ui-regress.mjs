// 商品引用 UI 级回归（Playwright，真实手机视口 + 真实商品页）
//
// 覆盖：
//   ① 商品页有「咨询此商品」按钮
//   ② 点按钮 → 聊天浮窗打开，输入框上方出现商品引用条（显示商品名）
//   ③ 点「把商品发给客服」→ 访客侧出现商品卡片
//   ④ H5 客服台实时收到这条商品消息，渲染成可点击商品卡片（含名称/价格）
//   ⑤ 卡片链接指向商品详情页（含 locale 段）
//   ⑥ 访客粘贴商城链接 → 自动识别成商品引用 → 同样渲染成卡片
//   ⑦ 粘贴外站链接 → 不误判成商品
import { createRequire } from 'module';
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
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'chat-product');
fs.mkdirSync(OUT, { recursive: true });

const PHONE = { width: 393, height: 852 };
const SLUG = '26padded-jacket-black';
const PROD_URL = `${BASE}/zh/products/${SLUG}`;
const SITE_URL = `https://www.mk.golf/zh/products/${SLUG}`;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  const visitorCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  const visitor = await visitorCtx.newPage();
  const vErrors = [];
  visitor.on('console', (m) => {
    if (m.type() === 'error') vErrors.push(m.text());
  });

  const csCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  const cs = await csCtx.newPage();

  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await adminCtx.newPage();

  const stamp = Date.now();
  const ua = `puia_${stamp}`;
  const ub = `puib_${stamp}`;
  const pwd = 'uitest123';
  const VISITOR_NAME = `商品访客${String(stamp).slice(-5)}`;

  try {
    // ---------- 后台建客服账号 ----------
    await admin.goto(`${BASE}/ko/admin/login`, { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(1500);
    await admin.locator('input[placeholder*="아이디"]').first().fill('admin@shop.com');
    await admin.locator('input[type="password"]').first().fill('admin1234');
    await admin.locator('button[type="submit"]').first().click();
    await admin.waitForTimeout(2500);

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
        return { a: await mk(ua, '商品客服A'), b: await mk(ub, '商品客服B') };
      },
      { ua, ub, pwd }
    );
    check('⓪0 后台可创建客服账号', created.a.status === 200 && created.b.status === 200);

    // ---------- ① 商品页「咨询此商品」按钮 ----------
    await visitor.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    await visitor.waitForTimeout(3000);
    const askBtn = visitor.locator('button[aria-label="咨询此商品"], button[aria-label="이 상품 문의하기"]').first();
    check('①A 商品页有「咨询此商品」按钮', (await askBtn.count()) > 0);
    await visitor.screenshot({ path: path.join(OUT, '01-product-page.png'), fullPage: false });

    // ---------- ② 点按钮 → 浮窗打开 + 引用条 ----------
    await askBtn.click();
    await visitor.waitForTimeout(1200);

    // 若还在留资表单 → 先建会话
    const nameInput = visitor.locator('input[placeholder*="称呼"], input[placeholder*="이름"]').first();
    if (await nameInput.count()) {
      await nameInput.fill(VISITOR_NAME);
      const startBtn = visitor.locator('button', { hasText: '开始对话' }).first();
      if (await startBtn.count()) await startBtn.click();
      await visitor.waitForTimeout(2200);
    }

    const refText = await visitor.locator('body').innerText();
    check(
      '②A 引用条出现且显示商品名',
      refText.includes('当前商品') && /JACKET/i.test(refText),
      refText.slice(0, 80).replace(/\n/g, ' | ')
    );

    // ---------- ③ 一键发商品 ----------
    const sendProductBtn = visitor.locator('button[aria-label="把商品发给客服"]').first();
    check('③A 有「把商品发给客服」按钮', (await sendProductBtn.count()) > 0);
    await sendProductBtn.click();
    await visitor.waitForTimeout(2500);

    const cardOnVisitor = visitor.locator('div[data-chat-panel] a[href*="/products/"]').first();
    check('③B 访客侧出现商品卡片', (await cardOnVisitor.count()) > 0);
    await visitor.screenshot({ path: path.join(OUT, '02-visitor-sent-product.png') });

    // ---------- ④ H5 客服实时收到卡片 ----------
    await cs.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
    await cs.waitForTimeout(1200);
    await cs.locator('input[autocomplete="username"]').first().fill(ua);
    await cs.locator('input[type="password"]').first().fill(pwd);
    await cs.locator('button[type="submit"]').first().click();
    await cs.waitForTimeout(3500);
    check('④0 H5 客服登录成功', cs.url().endsWith('/cs'), cs.url());

    // 找到刚才那个访客会话并点开
    // ⚠️ 列表是 3 秒轮询加载的，固定 sleep 会竞态 → 等到列表出现
    await cs.locator('main button').first().waitFor({ timeout: 20000 }).catch(() => {});
    const rowText = await cs.locator('main').first().innerText();
    check('④A 客服列表出现该访客会话', rowText.includes(VISITOR_NAME) || rowText.includes('[商品]'), rowText.slice(0, 100).replace(/\n/g, ' | '));
    await cs.locator('main button').first().click();
    await cs.waitForTimeout(3000);

    const csBody = await cs.locator('body').innerText();
    // 价格符号：formatPrice 输出的是全角 ₩(U+FFE6)，不是半角 ₩(U+20A9)
    check('④B 客服端渲染出商品卡片', csBody.includes('JACKET') && /115,000/.test(csBody), csBody.slice(0, 140).replace(/\n/g, ' | '));

    const csCard = cs.locator('a[href*="/products/"]').first();
    const href = (await csCard.count()) ? await csCard.getAttribute('href') : '';
    check('④C 卡片链接指向商品详情页', !!href && href.includes(`/products/${SLUG}`), href || '无');
    check('④D 卡片链接含 locale 段', !!href && /\/(ko|zh|en)\/products\//.test(href), href || '无');
    await cs.screenshot({ path: path.join(OUT, '03-agent-sees-card.png') });

    // ---------- ⑥ 粘贴商城链接 → 自动识别 ----------
    // ⚠️ 商品页还有"写评价"表单的 textarea，DOM 顺序在聊天浮窗之前 → 必须限定在浮窗内
    const ta = visitor.locator('div[data-chat-panel] textarea').first();
    await ta.fill(SITE_URL);
    await visitor.locator('div[data-chat-panel] button', { hasText: '发送' }).first().click();
    await visitor.waitForTimeout(2500);
    const panelText = await visitor.locator('div[data-chat-panel]').innerText();
    check('⑥A 粘贴商城链接被识别成商品卡片', panelText.includes('JACKET') && /115,000/.test(panelText), panelText.slice(0, 160).replace(/\n/g, ' | '));
    await visitor.screenshot({ path: path.join(OUT, '04-pasted-link.png') });

    // ---------- ⑦ 粘贴外站链接 → 不误判 ----------
    await ta.fill('https://example.com/products/some-other-item');
    await visitor.locator('div[data-chat-panel] button', { hasText: '发送' }).first().click();
    await visitor.waitForTimeout(2000);
    // 只数聊天浮窗里的卡片（商品页底部还有"相关商品"链接，不能混进来）
    const cards = await visitor.locator('div[data-chat-panel] a[href*="/products/"]').count();
    check('⑦A 外站链接不生成商品卡片', cards === 2, `浮窗内卡片数 ${cards}（应为 2）`);

    // ---------- 控制台无报错 ----------
    const realErrors = vErrors.filter(
      (e) => !/favicon|Download the React DevTools|ERR_CONNECTION_RESET|Failed to load resource/i.test(e)
    );
    check('⑧ 访客页面无 JS 报错', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));
  } finally {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query(`DELETE FROM "ChatConversation" WHERE "visitorName" = $1`, [VISITOR_NAME]);
      await pool.query(`DELETE FROM "ChatReadCursor" WHERE "staffId" LIKE 'agent:%'`);
      await pool.query(`DELETE FROM "ChatAgent" WHERE "username" IN ($1,$2)`, [ua, ub]);
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
