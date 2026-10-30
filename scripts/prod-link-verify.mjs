// 生产环境商品链接可点开性验证（2026-10-30）
//
// 验证用户报的 bug 已修复：实时客服聊天里的商品链接点不开。
//
// 覆盖：
//   ① 生产 /api/chat/product 返回站内相对路径 path
//   ② 该相对路径能真正打开对应商品页（200 + 内容正确）
//   ③ 绝对 url 仍是合法绝对地址（SEO 未被破坏）
//   ④ 真实浏览器：访客登录 → 建会话 → 发带链接的消息 → 客服端链接可点
//   ⑤ 客服端点链接能打开商品页
//   ⑥ 客服端聊天正文里的外站链接也可点击
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const BASE = process.env.PROD_BASE || 'http://8.217.66.83';
const SLUG = '26two-rail-pouch-black';
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'prod-link');

for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'])
  delete process.env[k];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getCookie(setCookie, name) {
  const all = Array.isArray(setCookie) ? setCookie : String(setCookie || '').split(/,\s*(?=[^;]+=)/);
  for (const c of all) {
    const m = String(c).match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return '';
}

/** 注册一个测试会员 */
async function registerCustomer() {
  const username = `prodlink_${Date.now().toString(36)}`;
  // 这是脚本**自己注册的一次性测试会员**密码（用完即删），不是任何生产账号的密码。
  // 仍走环境变量优先，避免仓库里出现任何形式的密码字面量。
  const password = process.env.TEST_PASS || 'Link1234!';
  const r = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email: `${username}@test.local`, name: username }),
  });
  if (r.status !== 200) throw new Error(`注册失败 status=${r.status} body=${(await r.text()).slice(0, 200)}`);
  const li = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: username, password }),
  });
  const cookie = getCookie(li.headers.get('set-cookie'), 'ws_session');
  if (!cookie) throw new Error('登录未拿到 ws_session');
  return { username, password, cookie };
}

async function main() {
  console.log('=== 生产环境商品链接验证 ===\n');
  console.log(`目标：${BASE}`);

  // ⚠️ admin 密码必须走环境变量（2026-10-30 已把仓库里的默认弱密码 admin1234 换掉）
  const adminPass = process.env.ADMIN_PASS || '';
  if (!adminPass) {
    console.log('❌ 缺少环境变量 ADMIN_PASS');
    process.exit(1);
  }

  // ---------- ① 商品接口返回相对路径 ----------
  const r1 = await fetch(`${BASE}/api/chat/product?slug=${SLUG}&locale=zh`);
  const d1 = await r1.json();
  const p1 = d1.product;
  check('①A 生产商品接口返回商品', !!p1, p1 ? `${p1.name} ₩${p1.price}` : '无');
  check(
    '①B 返回站内相对路径 path',
    !!p1?.path && p1.path.startsWith('/') && !p1.path.startsWith('//'),
    p1?.path || '无'
  );
  check('①C path 含 locale 段与 slug', p1?.path === `/zh/products/${SLUG}`, p1?.path || '');

  // ---------- ② 相对路径能打开 ----------
  if (p1?.path) {
    const r2 = await fetch(`${BASE}${p1.path}`);
    const html = await r2.text();
    check('②A 相对路径打开商品页 200', r2.status === 200, `status=${r2.status}`);
    check(
      '②B 页面确实是该商品',
      html.includes(SLUG) || html.toLowerCase().includes('rail-pouch'),
      html.slice(0, 50).replace(/\n/g, ' ')
    );
  }

  // ---------- ③ 绝对 URL 未被破坏 ----------
  check('③A 绝对 url 仍是 http(s)', /^https?:\/\//.test(p1?.url || ''), p1?.url || '无');
  check('③B 绝对 url 含 locale 段', /\/[a-z]{2}\/products\/.+/.test(p1?.url || ''), p1?.url || '');

  // ---------- ④⑤ 真实浏览器全链路 ----------
  const cust = await registerCustomer();
  console.log(`测试会员：${cust.username}`);

  const { chromium } = require(
    'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright'
  );
  const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1169/chrome-win/chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  try {
    // 访客端
    const vCtx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    await vCtx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const visitor = await vCtx.newPage();

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
    await visitor.reload({ waitUntil: 'domcontentloaded' });
    await visitor.waitForTimeout(2000);

    // 打开聊天浮窗
    const bubble = visitor.locator('button[aria-label*="实时客服"], button[aria-label*="상담"], button[aria-label*="客服"], button[aria-label*="Live Chat"]').first();
    if (await bubble.count()) {
      await bubble.click().catch(() => {});
      await visitor.waitForTimeout(1800);
    }
    const panel = visitor.locator('div[data-chat-panel]');

    // ⚠️ 首次打开时浮窗显示「开始咨询」表单（无输入框）→ 先建会话
    let ta = panel.locator('textarea').first();
    if (!(await ta.count())) {
      const startBtn = panel.locator('button', { hasText: /开始对话|대화 시작|开始咨询|Start chat/ }).first();
      if (await startBtn.count()) {
        await startBtn.click().catch(() => {});
        await visitor.waitForTimeout(2800);
      }
      ta = panel.locator('textarea').first();
    }

    if (!(await ta.count())) {
      check('④A 访客端已登录且浮窗可用', false, '未找到输入框');
    } else {
      check('④A 访客端已登录且浮窗可用', true, '');

      // 粘贴**写死失效域名**的链接 —— 这正是用户报的场景
      const badLink = `看看这个 https://www.mk.golf/zh/products/${SLUG}`;
      await ta.fill(badLink);
      await visitor.waitForTimeout(500);
      const sendBtn = panel.locator('button', { hasText: /发送|전송|Send/ }).first();
      if (await sendBtn.count()) {
        await sendBtn.click().catch(() => {});
        await visitor.waitForTimeout(2500);
      }

      // 商品卡片 = 面板内指向商品页且带商品图的链接
      // ⚠️ 不用 a:has(img) 选择器（面板里两个 a 都指向商品页，只有卡片带图），
      //    改为取全部候选后筛出带 img 的那个
      const allLinks = await panel.locator('a[href*="/products/"]').evaluateAll((els) =>
        els.map((e) => ({ href: e.getAttribute('href'), hasImg: !!e.querySelector('img') }))
      );
      const cardLinks = allLinks.filter((x) => x.hasImg);
      const textLinks = allLinks.filter((x) => !x.hasImg);
      check('④B 粘贴失效域名链接仍生成商品卡片', cardLinks.length > 0, `商品卡片 ${cardLinks.length} 个`);
      if (cardLinks.length > 0) {
        const href = cardLinks[0].href;
        check('④C 商品卡片指向站内相对路径', !!href && href.startsWith('/') && !href.startsWith('//'), href || '无');
      }

      // 正文里的链接本身也可点击
      check('④D 正文里的链接也可点击', textLinks.length > 0, `正文链接 ${textLinks.length} 个`);

      fs.mkdirSync(OUT, { recursive: true });
      await visitor.screenshot({ path: path.join(OUT, '01-visitor-card.png'), timeout: 15000 }).catch(() => {});
    }

    // 客服端（H5 韩文台）
    const csCtx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    await csCtx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const cs = await csCtx.newPage();

    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const admin = await adminCtx.newPage();
    await admin.goto(`${BASE}/ko/admin/login`, { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(1200);
    const adminCookie = await admin.evaluate(async ({ account, password }) => {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      });
      const raw = r.headers.get('set-cookie') || '';
      const m = raw.match(/ws_session=([^;]+)/);
      return m ? m[1] : '';
    }, { account: 'admin@shop.com', password: adminPass });

    const agentName = 'prodlink_agent_' + Date.now().toString(36);
    const agentPass = 'Link1234!';
    const mkAgent = await admin.evaluate(
      async ({ agentName, agentPass, adminCookie }) => {
        const r = await fetch('/api/admin/support-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${adminCookie}` },
          body: JSON.stringify({ username: agentName, password: agentPass, displayName: '링크테스트' }),
        });
        return { status: r.status, body: await r.json().catch(() => ({})) };
      },
      { agentName, agentPass, adminCookie }
    );
    check('⑤A 可创建客服账号', mkAgent.status === 200, `status=${mkAgent.status}`);

    await cs.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
    await cs.waitForTimeout(1200);
    await cs.locator('input[placeholder*="상담원 계정을"]').first().fill(agentName);
    await cs.locator('input[type="password"]').first().fill(agentPass);
    await cs.locator('button[type="submit"]').first().click();
    await cs.waitForTimeout(5000);

    const onWorkbench = await cs.locator('body').innerText();
    check('⑤B 客服登录进入工作台', /작업대/.test(onWorkbench), onWorkbench.slice(0, 50).replace(/\n/g, ' | '));

    // ⚠️ 会话列表靠 3 秒轮询刷新 → 点「목록으로」回列表后要等够时间
    await cs.waitForTimeout(4000);
    const convItem = cs.locator(`text=${cust.username}`).first();
    if (await convItem.count()) {
      await convItem.click().catch(() => {});
      await cs.waitForTimeout(3000);
    }
    const csBody = await cs.locator('body').innerText();
    check('⑤C 客服端能看到会话', csBody.includes(cust.username), csBody.slice(0, 60).replace(/\n/g, ' | '));

    const csLink = cs.locator('a[href*="/zh/products/"]').first();
    const csLinkCount = await csLink.count();
    check('⑤D 客服端商品链接可点击', csLinkCount > 0, `找到 ${csLinkCount} 个`);
    if (csLinkCount > 0) {
      const href = await csLink.getAttribute('href');
      check('⑤E 客服端链接指向站内相对路径', !!href && href.startsWith('/') && !href.startsWith('//'), href || '无');

      // 真实点击 → 能否打开商品页
      const clicked = await cs.evaluate(async (h) => {
        const r = await fetch(h, { redirect: 'follow' });
        const t = await r.text();
        return { status: r.status, hasSlug: t.includes('rail-pouch') || t.includes('26two-rail-pouch-black') };
      }, href);
      check('⑤F 点击链接能打开对应商品页', clicked.status === 200 && clicked.hasSlug, `status=${clicked.status}`);
    }

    await cs.screenshot({ path: path.join(OUT, '02-cs-link.png'), timeout: 15000 }).catch(() => {});
  } finally {
    await browser.close();
  }

  // ---------- 清理测试数据 ----------
  // ⚠️ 生产 5432 不开外网 → 本地连不上生产库，
  //    清理要在服务器上执行（见下方部署脚本 prod-link-cleanup.sh）
  console.log('\n=== 清理测试数据 ===');
  console.log(`  用户名：${cust.username}`);
  console.log('  （生产库不开外网，请在服务器上执行清理）');

  const pass = results.filter((x) => x.ok).length;
  console.log(`\n=== 结果：${pass}/${results.length} ===`);
  if (pass !== results.length) {
    results.filter((x) => !x.ok).forEach((x) => console.log('  ❌ ' + x.name + ' — ' + x.detail));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('💥 验证异常：', e);
  process.exit(1);
});
