// H5 客服台韩文化 + 访客登录门槛 —— UI 级验证（Playwright，真实手机视口）
//
// 验证：
//   ① H5 客服登录页全韩文（无中文残留）
//   ② H5 客服工作台全韩文（列表页 + 聊天页）
//   ③ 访客未登录点开客服浮窗 → 只看到「登录 / 注册」引导，无输入框
//   ④ 访客登录后 → 浮窗显示账号名，可发起会话
//   ⑤ 客服端看到的客户名称 = 访客注册账号名
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
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'cs-korean');
fs.mkdirSync(OUT, { recursive: true });

const PHONE = { width: 393, height: 852 };

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 检测文本里是否残留中文（韩文界面不该出现汉字） */
function hasChinese(s) {
  return /[\u4e00-\u9fff]/.test(s || '');
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const stamp = Date.now().toString(36);
  const visitorUser = `kor_v_${stamp}`;
  const visitorPass = 'test1234';

  // ---------- ① H5 客服登录页韩文 ----------
  // ⚠️ 拦掉外网 Google Fonts：本机代理常挂住 → Playwright 截图卡在 "waiting for fonts to load" 超时
  const blockFonts = (ctx) => {
    ctx.route(/fonts\.(googleapis|gstatic)\.com/i, (route) => route.abort().catch(() => {}));
  };
  const csCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  blockFonts(csCtx);
  const cs = await csCtx.newPage();
  const csErrors = [];
  cs.on('console', (m) => {
    if (m.type() === 'error') csErrors.push(m.text());
  });
  cs.on('pageerror', (e) => csErrors.push(String(e)));

  await cs.goto(`${BASE}/cs/login`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  const loginText = await cs.locator('body').innerText();
  check('①A 登录页不含中文', !hasChinese(loginText), loginText.replace(/\n/g, ' | ').slice(0, 120));
  check('①B 含韩文「로그인」', loginText.includes('로그인'));
  check('①C 含韩文「상담원 계정」', loginText.includes('상담원 계정'));
  await cs.screenshot({ path: path.join(OUT, '01-cs-login-ko.png'), timeout: 15000 }).catch(() => {});

  // ---------- ② 后台建客服账号 → H5 登录 → 工作台韩文 ----------
  // ⚠️ 后台是桌面端操作：用桌面视口，否则手机顶栏会遮住「생성」按钮
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  blockFonts(adminCtx);
  const admin = await adminCtx.newPage();
  await admin.goto(`${BASE}/ko/admin/login`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  // 后台登录表单无 autocomplete 属性 → 按顺序定位：①账号 ②密码
  const loginInputs = admin.locator('form input');
  await loginInputs.nth(0).fill('admin@shop.com');
  await loginInputs.nth(1).fill('admin1234');
  await admin.locator('form button[type="submit"]').first().click();
  await admin.waitForURL(/\/ko\/admin/, { timeout: 20000 }).catch(() => {});
  await sleep(1500);

  const agentName = `kor_${stamp}`;
  await admin.goto(`${BASE}/ko/admin/support-agents`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  // 表单顺序固定：①账号 ②显示名称 ③密码（placeholder 三语不同，用位置定位）
  const inputs = admin.locator('form input');
  const inputCount = await inputs.count();
  check('②0 后台建号表单有 3 个输入框', inputCount >= 3, `count=${inputCount}`);
  await inputs.nth(0).fill(agentName);
  if (inputCount >= 2) await inputs.nth(1).fill('한국어상담원');
  if (inputCount >= 3) await inputs.nth(2).fill('kor1234');
  await admin.locator('form button[type="submit"]').first().click();
  await sleep(1800);
  const agentPageText = await admin.locator('body').innerText();
  check('②A 客服账号已创建', agentPageText.includes(agentName), agentName);
  await admin.screenshot({ path: path.join(OUT, '02-admin-agents.png'), timeout: 15000 }).catch(() => {});

  // H5 登录
  await cs.fill('input[autocomplete="username"]', agentName);
  await cs.fill('input[type="password"]', 'kor1234');
  await cs.click('button[type="submit"]');
  await cs.waitForURL(/\/cs$/, { timeout: 20000 }).catch(() => {});
  await sleep(2500);
  // ⚠️ 只查界面骨架（header + 空状态），列表里的访客消息内容可能是中文，不算界面文案
  const workHeader = await cs.locator('header').first().innerText().catch(() => '');
  check('②B 工作台顶栏不含中文', !hasChinese(workHeader), workHeader.replace(/\n/g, ' | ').slice(0, 140));
  check('②C 含韩文「상담원 작업대」', workHeader.includes('상담원 작업대'), workHeader.replace(/\n/g, ' | '));
  check('②D 含韩文「로그아웃」', workHeader.includes('로그아웃'));
  await cs.screenshot({ path: path.join(OUT, '03-cs-workbench-ko.png'), timeout: 15000 }).catch(() => {});

  // ---------- ③ 访客未登录 → 只看到登录引导 ----------
  const vCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  blockFonts(vCtx);
  const v = await vCtx.newPage();
  const vErrors = [];
  v.on('console', (m) => {
    if (m.type() === 'error') vErrors.push(m.text());
  });
  v.on('pageerror', (e) => vErrors.push(String(e)));

  await v.goto(`${BASE}/ko`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  // 悬浮入口按钮：aria-label 是 IM 文案（三语不同），用「fixed + 圆形按钮」特征定位
  const fab = v.locator('button.fixed.bottom-5.right-5').first();
  if ((await fab.count()) > 0) {
    await fab.click();
  } else {
    await v.locator('button', { hasText: /실시간 상담|实时客服|Live Chat/ }).first().click();
  }
  await sleep(1500);
  const panel = v.locator('div[data-chat-panel]');
  const panelText = await panel.innerText().catch(() => '');
  check('③A 未登录显示登录引导', panelText.includes('로그인') || panelText.includes('登录'), panelText.replace(/\n/g, ' | ').slice(0, 120));
  check('③B 未登录面板无消息输入框', (await panel.locator('textarea').count()) === 0);
  check('③C 未登录面板无「开始对话」按钮', !/대화 시작|开始对话|Start chat/.test(panelText), panelText.replace(/\n/g, ' | ').slice(0, 120));
  await v.screenshot({ path: path.join(OUT, '04-visitor-login-gate.png'), timeout: 15000 }).catch(() => {});

  // ---------- ④ 访客登录 → 显示账号名 → 可发起会话 ----------
  const reg = await v.request.post(`${BASE}/api/auth/register`, {
    data: { username: visitorUser, password: visitorPass },
  });
  check('④A 访客注册成功', reg.ok(), `status=${reg.status()}`);
  const li = await v.request.post(`${BASE}/api/auth/login`, {
    data: { account: visitorUser, password: visitorPass },
  });
  check('④B 访客登录成功', li.ok(), `status=${li.status()}`);

  await v.goto(`${BASE}/ko?chat=1`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const panel2 = v.locator('div[data-chat-panel]');
  const p2Text = await panel2.innerText().catch(() => '');
  check('④C 登录后浮窗自动打开', (await panel2.count()) > 0);
  check('④D 显示注册账号名', p2Text.includes(visitorUser), p2Text.replace(/\n/g, ' | ').slice(0, 140));
  check('④E 出现「开始对话」按钮', /대화 시작|开始对话|Start chat/.test(p2Text), p2Text.replace(/\n/g, ' | ').slice(0, 140));
  await v.screenshot({ path: path.join(OUT, '05-visitor-account-name.png'), timeout: 15000 }).catch(() => {});

  // ---------- ⑤ 发起会话 → 客服端看到账号名 ----------
  await panel2.locator('button', { hasText: /대화 시작|开始对话|Start chat/ }).first().click();
  await sleep(2500);
  const p3Text = await panel2.innerText().catch(() => '');
  check('⑤A 会话已建立（有输入框）', (await panel2.locator('textarea').count()) > 0, p3Text.replace(/\n/g, ' | ').slice(0, 120));
  await v.screenshot({ path: path.join(OUT, '06-visitor-chatting.png'), timeout: 15000 }).catch(() => {});

  // 客服端刷新列表看客户名
  await cs.reload({ waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const csListText = await cs.locator('body').innerText();
  check('⑤B 客服端显示客户注册账号名', csListText.includes(visitorUser), csListText.replace(/\n/g, ' | ').slice(0, 160));
  await cs.screenshot({ path: path.join(OUT, '07-cs-sees-account-name.png'), timeout: 15000 }).catch(() => {});

  // ---------- ⑥ 无 JS 报错 ----------
  const realVErrors = vErrors.filter((e) => !/favicon|404|Failed to load resource/i.test(e));
  check('⑥A 访客端无 JS 报错', realVErrors.length === 0, realVErrors.slice(0, 2).join(' | '));
  const realCErrors = csErrors.filter((e) => !/favicon|404|Failed to load resource/i.test(e));
  check('⑥B 客服端无 JS 报错', realCErrors.length === 0, realCErrors.slice(0, 2).join(' | '));

  // ---------- 清理 ----------
  try {
    const { Pool } = await import('pg');
    const dotenv = require('dotenv');
    dotenv.config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`DELETE FROM "ChatConversation" WHERE "visitorName" = $1`, [visitorUser]);
    await pool.query(`DELETE FROM "User" WHERE "username" = $1`, [visitorUser]);
    await pool.query(`DELETE FROM "ChatAgent" WHERE "username" = $1`, [agentName]);
    await pool.end();
    console.log('\n🧹 测试数据已清理');
  } catch (e) {
    console.log('\n⚠️ 清理失败：', String(e).slice(0, 120));
  }

  await browser.close();

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n===== 结果：${pass}/${results.length} 通过 =====\n`);
  if (pass !== results.length) {
    console.log('失败项：');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ❌ ${r.name} — ${r.detail}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('脚本异常：', e);
  process.exitCode = 1;
});
