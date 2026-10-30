// 生产环境可视验证：截图 /cs 韩文登录页、韩文客服工作台、商城前台聊天浮窗
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright');
const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1169/chrome-win/chrome.exe';

const BASE = 'http://8.217.66.83';
const OUT = path.resolve('scripts/shots/prod-verify');
const AGENT = {
  user: process.env.CS_AGENT_USER || '',
  pass: process.env.CS_AGENT_PASS || '',
};
const PHONE = { width: 393, height: 852 };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });

  // ⚠️ 外网 Google Fonts 走本机代理会挂死截图 → 直接拦掉
  const ctx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

  const page = await ctx.newPage();

  // ① 韩文登录页
  await page.goto(BASE + '/cs/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const loginText = await page.locator('body').innerText();
  console.log('① /cs/login 文案片段:', loginText.replace(/\n+/g, ' | ').slice(0, 150));
  await page.screenshot({ path: path.join(OUT, '01-cs-login-ko.png'), timeout: 15000 }).catch(() => {});

  // ② 登录 → 韩文工作台
  await page.locator('input[placeholder*="상담원 계정을"]').first().fill(AGENT.user);
  await page.locator('input[type="password"]').first().fill(AGENT.pass);
  await page.locator('button[type="submit"]').first().click();
  // ⚠️ 生产（香港 VPS + 2Mbps）握手比本地慢：fetch ws-token + WS 升级 + auth 往返，实测需 ~8-12s
  await page.waitForTimeout(12000);
  const workText = await page.locator('body').innerText();
  console.log('② /cs 工作台文案片段:', workText.replace(/\n+/g, ' | ').slice(0, 180));
  await page.screenshot({ path: path.join(OUT, '02-cs-workbench-ko.png'), timeout: 15000 }).catch(() => {});

  // ③ 商城前台 + 聊天浮窗（访客未登录 → 应见登录引导）
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await dctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const dp = await dctx.newPage();
  await dp.goto(BASE + '/zh', { waitUntil: 'domcontentloaded' });
  await dp.waitForTimeout(3000);
  await dp.screenshot({ path: path.join(OUT, '03-shop-home.png'), timeout: 15000 }).catch(() => {});

  // 点开聊天浮球（aria-label = imTitle，中文「实时客服」/ 韩文「실시간 상담」）
  const bubble = dp.locator('button[aria-label="实时客服"], button[aria-label="실시간 상담"]').first();
  const hasBubble = (await bubble.count()) > 0;
  console.log('③ 聊天浮球存在:', hasBubble);
  if (hasBubble) {
    await bubble.click().catch(() => {});
    await dp.waitForTimeout(2500);
    const panel = dp.locator('div[data-chat-panel]').first();
    if (await panel.count()) {
      const t = await panel.innerText();
      console.log('   未登录浮窗文案:', t.replace(/\n+/g, ' | ').slice(0, 200));
      console.log('   含登录引导:', /登录|로그인/.test(t));
      console.log('   含注册引导:', /注册|회원가입/.test(t));
      console.log('   有输入框(应为 0):', await panel.locator('textarea').count());
      console.log('   有「开始对话」按钮(应为 0):', await panel.locator('button', { hasText: /开始对话|대화 시작|Start chat/ }).count());
    } else {
      console.log('   ❌ 未找到 data-chat-panel');
    }
    await dp.screenshot({ path: path.join(OUT, '04-chat-widget-gate.png'), timeout: 15000 }).catch(() => {});
  }

  await browser.close();
  console.log('\n截图目录:', OUT);
}

main().catch((e) => { console.error('错误:', e); process.exit(1); });
