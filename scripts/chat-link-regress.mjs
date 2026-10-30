// 商品链接可点开性回归测试（2026-10-30）
//
// 背景：用户反馈「实时聊天里发的商品链接打不开，链接地址不对」。
// 根因：卡片链接写死 https://www.mk.golf/xx/products/xxx，但该域名 DNS
//       指向一台已下线的韩国主机（27.102.137.133），源站又只有 80 端口
//       没有 443 → 一点就是 ERR_QUIC_PROTOCOL_ERROR。
//
// 覆盖：
//   ① /api/chat/product 返回站内相对路径 path，且该路径能打开对应商品页
//   ② 换 Host 头访问时 path 保持可用（跟随当前访问主机）
//   ③ 绝对 URL 仍是合法绝对地址（含 locale 段，SEO 用，不能被改成相对）
//   ④ 聊天正文里的链接可点击且指向站内相对路径（真实浏览器验证）
//   ⑤ 本站域名识别：当前访问主机也算本站（粘贴链接能识别出商品）
import 'dotenv/config';
import { loginTestCustomer } from './chat-test-user.mjs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const BASE = 'http://127.0.0.1:3000';
const SLUG = '26two-rail-pouch-black';
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'chat-link');

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

let custCookie = '';
let custUser = '';
let custPass = '';

async function main() {
  console.log('=== 商品链接可点开性回归 ===\n');

  // ---------- 准备测试会员 ----------
  const cust = await loginTestCustomer('im');
  custCookie = cust.cookie;
  custUser = cust.username;
  custPass = cust.password;
  console.log(`测试会员：${custUser}`);

  // ---------- ① 商品接口返回相对路径 path ----------
  const r1 = await fetch(`${BASE}/api/chat/product?slug=${SLUG}&locale=zh`);
  const d1 = await r1.json();
  const p1 = d1.product;
  check('①A 商品接口返回商品数据', !!p1, p1 ? p1.name : JSON.stringify(d1).slice(0, 120));
  check(
    '①B 返回站内相对路径 path',
    !!p1?.path && p1.path.startsWith('/') && !p1.path.startsWith('//'),
    p1?.path || '无'
  );
  check(
    '①C path 含 locale 段且 slug 正确',
    p1?.path === `/zh/products/${SLUG}`,
    p1?.path || ''
  );

  // ---------- ② 相对路径能真正打开商品页 ----------
  if (p1?.path) {
    const r2 = await fetch(`${BASE}${p1.path}`);
    const html = await r2.text();
    check('②A 相对路径打开商品页返回 200', r2.status === 200, `status=${r2.status}`);
    check(
      '②B 打开的确实是该商品页',
      html.includes(SLUG) || html.toLowerCase().includes('rail-pouch'),
      html.slice(0, 60).replace(/\n/g, ' ')
    );
  }

  // ---------- ③ 不同 Host 头下 path 保持可用 ----------
  // ⚠️ 这里用 locale=ko 请求，所以 path 应是 /ko/... —— 断言的是「换 Host 不影响 path 生成」
  const r3 = await fetch(`${BASE}/api/chat/product?slug=${SLUG}&locale=ko`, {
    headers: { Host: '8.217.66.83' },
  });
  const d3 = await r3.json();
  check(
    '③A 换 Host 后 path 仍按 locale 正确生成',
    d3.product?.path === `/ko/products/${SLUG}`,
    `${d3.product?.path}（期望 /ko/products/${SLUG}）`
  );
  if (d3.product?.path) {
    const r3b = await fetch(`${BASE}${d3.product.path}`);
    check('③B 换 Host 后的相对路径也能打开', r3b.status === 200, `status=${r3b.status}`);
  }

  // ---------- ④ 绝对 URL 仍是合法绝对地址（SEO 不能改成相对） ----------
  check('④A 绝对 url 仍是 http(s) 开头', /^https?:\/\//.test(p1?.url || ''), p1?.url || '无');
  check('④B 绝对 url 含 locale 段与 slug', /\/[a-z]{2}\/products\/.+/.test(p1?.url || ''), p1?.url || '');

  // ---------- ⑤ 真实浏览器：访客发链接 → 客服端链接可点且指向站内 ----------
  const { chromium } = require(
    'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright'
  );
  const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1169/chrome-win/chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  try {
    // 访客端：登录 → 建会话 → 发一条带商品链接的消息
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
      { account: custUser, password: custPass }
    );
    // ⚠️ 登录后必须刷新：AuthProvider 是在挂载时读的服务端会话快照，
    //    不刷新的话聊天浮窗仍是「未登录」态，看不到输入框
    await visitor.reload({ waitUntil: 'domcontentloaded' });
    await visitor.waitForTimeout(1500);

    // 建会话（访客必须登录）
    const convRes = await visitor.evaluate(async () => {
      const r = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactType: 'chat', locale: 'zh' }),
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    });
    check('⑤A 访客登录后可建会话', convRes.status === 200, `status=${convRes.status}`);
    const convId = convRes.body?.id;
    const guest = convRes.body?.guestToken;

    // 发一条正文含商品链接的消息
    const linkText = `这个好看吗 https://www.mk.golf/zh/products/${SLUG}`;
    const msgRes = await visitor.evaluate(
      async ({ convId, guest, linkText }) => {
        const r = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convId, guestToken: guest, content: linkText }),
        });
        return { status: r.status, body: await r.json().catch(() => ({})) };
      },
      { convId, guest, linkText }
    );
    check('⑤B 访客可发送含链接的消息', msgRes.status === 200, `status=${msgRes.status}`);

    // ---------- ⑥ 访客粘贴 IP 入口链接 → 自动识别成商品引用 ----------
    // 这是放宽 isOwnHost 的目的：用户从 IP/备用入口访问时，
    // 粘贴的商城链接也要能识别出商品，而不是当成普通外链。
    //
    // 走真实用户路径：打开浮窗 → 点「开始咨询」建会话 → 输入框粘贴链接发送。
    const bubble = visitor.locator('button[aria-label*="实时客服"], button[aria-label*="상담"], button[aria-label*="客服"]').first();
    if (await bubble.count()) {
      await bubble.click().catch(() => {});
      await visitor.waitForTimeout(1800);
    } else {
      check('⑥A 访客端聊天面板可用', false, '未找到聊天浮窗入口');
    }

    const panel = visitor.locator('div[data-chat-panel]');
    const ta = panel.locator('textarea').first();

    if (await ta.count()) {
      // 已经有会话（前面建过）→ 直接粘贴发送
      const ipLinkText = `看看这个 http://8.217.66.83/zh/products/${SLUG}`;
      await ta.fill(ipLinkText);
      await visitor.waitForTimeout(600);
      const sendBtn = panel.locator('button', { hasText: /发送|보내기|Send/ }).first();
      if (await sendBtn.count()) {
        await sendBtn.click().catch(() => {});
        await visitor.waitForTimeout(2500);
      }
      // 访客消息里应出现商品卡片（相对路径链接）
      const cardLink = panel.locator('a[href*="/zh/products/"], a[href*="/ko/products/"]').first();
      const cardCount = await cardLink.count();
      check('⑥B 粘贴 IP 入口链接被识别成商品卡片', cardCount > 0, `找到 ${cardCount} 个商品链接`);
      if (cardCount > 0) {
        const href = await cardLink.getAttribute('href');
        check(
          '⑥C 商品卡片指向站内相对路径',
          !!href && href.startsWith('/') && !href.startsWith('//'),
          href || '无'
        );
      }
    } else {
      // 没有会话 → 先走「开始咨询」建会话
      const startBtn = panel.locator('button', { hasText: /开始对话|대화 시작|开始咨询|Start chat/ }).first();
      if (await startBtn.count()) {
        await startBtn.click().catch(() => {});
        await visitor.waitForTimeout(2500);
      }
      const ta2 = panel.locator('textarea').first();
      if (await ta2.count()) {
        const ipLinkText = `看看这个 http://8.217.66.83/zh/products/${SLUG}`;
        await ta2.fill(ipLinkText);
        await visitor.waitForTimeout(600);
        const sendBtn = panel.locator('button', { hasText: /发送|보내기|Send/ }).first();
        if (await sendBtn.count()) {
          await sendBtn.click().catch(() => {});
          await visitor.waitForTimeout(2500);
        }
        const cardLink = panel.locator('a[href*="/zh/products/"], a[href*="/ko/products/"]').first();
        const cardCount = await cardLink.count();
        check('⑥B 粘贴 IP 入口链接被识别成商品卡片', cardCount > 0, `找到 ${cardCount} 个商品链接`);
        if (cardCount > 0) {
          const href = await cardLink.getAttribute('href');
          check('⑥C 商品卡片指向站内相对路径', !!href && href.startsWith('/') && !href.startsWith('//'), href || '无');
        }
      } else {
        check('⑥B 粘贴 IP 入口链接被识别成商品卡片', false, '未找到输入框');
      }
    }

    // 客服端（H5）：登录 → 进会话 → 看链接
    const csCtx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    await csCtx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const cs = await csCtx.newPage();

    // 建一个客服账号
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
    }, { account: 'admin@shop.com', password: 'admin1234' });

    const agentName = 'linkagent_' + Date.now().toString(36);
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
    check('⑤C 可创建客服账号', mkAgent.status === 200, `status=${mkAgent.status}`);

    await cs.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
    await cs.waitForTimeout(1200);
    await cs.locator('input[placeholder*="상담원 계정을"]').first().fill(agentName);
    await cs.locator('input[type="password"]').first().fill(agentPass);
    await cs.locator('button[type="submit"]').first().click();
    await cs.waitForTimeout(4000);

    const onWorkbench = await cs.locator('body').innerText();
    check('⑤D 客服登录进入工作台', /작업대|연결됨|재연결/.test(onWorkbench), onWorkbench.slice(0, 60).replace(/\n/g, ' | '));

    // 进会话（列表里点访客名）
    const convItem = cs.locator(`text=${custUser}`).first();
    let opened = false;
    if (await convItem.count()) {
      await convItem.click().catch(() => {});
      await cs.waitForTimeout(2500);
      opened = true;
    }
    check('⑤E 客服端能看到该会话', opened, opened ? '已打开' : '列表中未找到访客');

    // 正文里的链接 → 可点击 + href 是站内相对路径
    const linkLoc = cs.locator('a[href*="/zh/products/"], a[href*="/ko/products/"]').first();
    const linkCount = await linkLoc.count();
    check('⑤F 正文里的商品链接可点击（渲染成 <a>）', linkCount > 0, `找到 ${linkCount} 个`);

    if (linkCount > 0) {
      const href = await linkLoc.getAttribute('href');
      const isRelative = !!href && href.startsWith('/') && !href.startsWith('//');
      check('⑤G 链接指向站内相对路径（不是失效域名）', isRelative, href || '无 href');

      // 点击后能打开商品页
      const page = await csContextPage(cs, href);
      check('⑤H 点击链接能打开对应商品页', page.ok, page.detail);
    }

    fs.mkdirSync(OUT, { recursive: true });
    await cs.screenshot({ path: path.join(OUT, '01-cs-link.png'), timeout: 15000 }).catch(() => {});
  } finally {
    await browser.close();
  }

  // ---------- 汇总 ----------
  const pass = results.filter((x) => x.ok).length;
  console.log(`\n=== 结果：${pass}/${results.length} ===`);
  if (pass !== results.length) {
    console.log('失败项：');
    results.filter((x) => !x.ok).forEach((x) => console.log('  ❌ ' + x.name + ' — ' + x.detail));
    process.exit(1);
  }
}

/** 在新标签打开 href，返回是否成功拿到商品页 */
async function csContextPage(page, href) {
  try {
    const resp = await page.evaluate(async (h) => {
      const r = await fetch(h, { redirect: 'follow' });
      const t = await r.text();
      return { status: r.status, len: t.length, hasSlug: t.includes('rail-pouch') };
    }, href);
    return { ok: resp.status === 200 && resp.hasSlug, detail: `status=${resp.status} len=${resp.len}` };
  } catch (e) {
    return { ok: false, detail: String(e.message).slice(0, 80) };
  }
}

main().catch((e) => {
  console.error('💥 回归异常：', e);
  process.exit(1);
});
