/**
 * 生产验证：右下角客服悬浮按钮**只应有一个**（黑色实时客服）。
 *
 * 背景（2026-10-30）：
 *   站内实时客服 IM 上线后，右下角同时存在两个客服入口，且定位完全重合：
 *     · 黑色「실시간 고객 서비스」→ 站内 IM（ChatWidget，z-50）
 *     · 黄色「채팅 상담」→ 外部 Kakao（KakaoChatButton，z-40）
 *   黄色被黑色压住只露出一角 → 看起来像按钮渲染坏了。
 *   子建拍板：前台只留黑色实时客服，Kakao 悬浮球改由后台开关控制
 *   （SiteSetting `kakao_fab_enabled`，默认关）。
 *
 * 用法：
 *   PROD_BASE=http://8.217.66.83 node scripts/prod-fab-verify.mjs
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const BASE = process.env.PROD_BASE || 'http://8.217.66.83';
const OUT = path.join(process.cwd(), 'scripts', 'shots', 'prod-fab');

const { chromium } = require(
  'C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-6/node_modules/@playwright/cli/node_modules/playwright'
);
const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1169/chrome-win/chrome.exe';

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    fail++;
    console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

/** 取出页面右下角所有 fixed 定位的圆形/胶囊按钮 */
async function fabButtons(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of Array.from(document.querySelectorAll('a,button'))) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 30 || r.height < 30) continue; // 过滤小图标
      if (r.bottom < window.innerHeight - 160) continue; // 只看右下角
      if (r.right < window.innerWidth - 260) continue;
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      const bg = cs.backgroundColor;
      const icon = el.querySelector('svg');
      out.push({
        text: text.slice(0, 40),
        bg,
        hasSvg: !!icon,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        z: cs.zIndex,
      });
    }
    return out;
  });
}

async function main() {
  console.log('=== 生产环境右下角客服按钮验证 ===\n');
  console.log(`目标：${BASE}\n`);

  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 700 } });
  // Google Fonts 走本机代理会挂死 → 直接拦掉
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();

  await page.goto(`${BASE}/ko`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);

  // ① 右下角悬浮按钮总数 —— 必须恰好 1 个
  const btns = await fabButtons(page);
  check(
    '① 右下角只有一个悬浮按钮',
    btns.length === 1,
    `实际 ${btns.length} 个：${btns.map((b) => `[${b.text || '无文字'}] bg=${b.bg} z=${b.z}`).join(' , ')}`
  );

  // ② 那个按钮必须带 SVG 图标（实时客服是聊天气泡图标）
  const b = btns[0];
  check('② 按钮带图标（聊天气泡）', !!b && b.hasSvg, b ? `hasSvg=${b.hasSvg}` : '无按钮');

  // ③ 必须是深色（黑色 bg-ink），不是 Kakao 黄 #FEE500
  const isKakaoYellow = b && /254,\s*229,\s*0/i.test(b.bg);
  check('③ 不是 Kakao 黄色（#FEE500）', !isKakaoYellow, b ? `bg=${b.bg}` : '无按钮');

  // ④ 文案应是实时客服（韩语 ko 站）
  const isChatLabel = b && /실시간|고객|상담/i.test(b.text);
  check('④ 文案为实时客服', !!isChatLabel, b ? `text="${b.text}"` : '无按钮');

  // ⑤ 后台开关关闭时，Kakao 悬浮球不应出现（判据：页面上没有指向 pf.kakao 的 fixed 链接）
  const kakaoFixed = await page.evaluate(() => {
    const list = [];
    for (const el of Array.from(document.querySelectorAll('a[href*="kakao"]'))) {
      if (getComputedStyle(el).position === 'fixed') list.push(el.getAttribute('href'));
    }
    return list;
  });
  check(
    '⑤ 无 Kakao 悬浮链接（fixed 定位）',
    kakaoFixed.length === 0,
    kakaoFixed.length ? kakaoFixed.join(',') : '无'
  );

  // 目视证据：右下角截图
  try {
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({
      path: path.join(OUT, '01-bottom-right.png'),
      clip: { x: 780, y: 480, width: 300, height: 220 },
      timeout: 15000,
    });
  } catch {
    // 截图失败不影响判定
  }

  // ⑥ 黑色按钮点击后能打开站内 IM 面板（证明功能没被这次改动影响）
  if (b) {
    const clicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('a,button')).find((n) => {
        const cs = getComputedStyle(n);
        if (cs.position !== 'fixed') return false;
        const r = n.getBoundingClientRect();
        return r.width > 60 && r.bottom > window.innerHeight - 160 && r.right > window.innerWidth - 260;
      });
      if (!el) return false;
      el.click();
      return true;
    });
    await page.waitForTimeout(2500);
    const panel = await page.locator('[data-chat-panel]').count();
    check('⑥ 点击后打开站内 IM 面板', clicked && panel > 0, `panel=${panel}`);
  }

  // ⑦ 商品页的 Kakao 主按钮不受影响（开关只管悬浮球）
  await page.goto(`${BASE}/ko/products/26two-rail-pouch-black`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  const kakaoBtn = await page.locator('text=/Kakao 상담/').count();
  check('⑦ 商品页 Kakao 主按钮仍在（开关只管悬浮球）', kakaoBtn > 0, `匹配 ${kakaoBtn} 处`);

  await browser.close();

  console.log(`\n=== 结果：${pass}/${pass + fail} ===`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('❌ 验证脚本异常：', e.message);
  process.exit(1);
});
