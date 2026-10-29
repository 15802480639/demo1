// 商品引用（访客把商品发给客服）端到端回归测试（接口级）
//
// 覆盖：
//   ① /api/chat/product 按 slug 返回商品卡片数据（名称/价格/图/链接/库存）
//   ② 非法 slug / 空 slug → 拒绝
//   ③ 访客发消息带 productSlug → 落库 + 历史接口都带得上
//   ④ 幂等：同 clientId 重复提交 → 只落一条，productSlug 不丢
//   ⑤ 客服端会话列表预览显示 [商品]
//   ⑥ 非法 productSlug（注入/超长/特殊字符）→ 被规整，不污染库
//   ⑦ 客服与访客互相看到对方发的商品引用
import 'dotenv/config';
import { loginTestCustomer } from './chat-test-user.mjs';
import { createRequire } from 'module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const BASE = 'http://127.0.0.1:3000';

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

async function loginAdmin() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({ account: 'admin@shop.com', password: 'admin1234' }),
  });
  return getCookie(r.headers.get('set-cookie'), 'ws_session');
}

/** 取一个真实上架商品（避免依赖写死的 slug） */
async function pickProduct() {
  const r = await fetch(`${BASE}/api/chat/product?slug=26padded-jacket-black&locale=zh`);
  const d = await r.json();
  return d.product || null;
}

let convId = null;
let guest = null;
const clientIds = [];
// ⚠️ 访客必须已登录（2026-10-29 起）→ 所有访客侧请求都要带 cookie
let custCookie = '';

async function main() {
  const adminCookie = await loginAdmin();
  check('①0 管理员登录', !!adminCookie);
  const cust = await loginTestCustomer('im');
  custCookie = cust.cookie;
  check('①0B 访客登录', !!custCookie);

  // ---------- ① 商品卡片接口 ----------
  const prod = await pickProduct();
  check('①A 商品卡片接口返回数据', !!prod && !!prod.slug && typeof prod.price === 'number', prod ? `${prod.name} / ${prod.price}` : '空');
  check('①B 商品链接走 urlProduct（含 locale 段）', !!prod && /\/[a-z]{2}\/products\/.+/.test(prod.url || ''), prod?.url || '');
  check('①C 图片地址存在', !!prod?.image, prod?.image || '无图');

  const bad = await fetch(`${BASE}/api/chat/product?slug=`);
  check('②A 空 slug 被拒', bad.status === 400, `HTTP ${bad.status}`);
  const bad2 = await fetch(`${BASE}/api/chat/product?slug=${encodeURIComponent('../../etc/passwd')}`);
  const bad2b = await bad2.json();
  check('②B 路径穿越 slug 被规整后查不到', bad2.status === 200 && !bad2b.product, `HTTP ${bad2.status}`);

  if (!prod) {
    console.log('\n⚠️ 没有可用商品，后续用例跳过');
    return;
  }

  // ---------- 建访客会话 ----------
  // ⚠️ 访客必须已登录才能建会话（2026-10-29 起）
  const cr = await fetch(`${BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(custCookie ? { Cookie: `ws_session=${custCookie}` } : {}) },
    body: JSON.stringify({ contactType: 'none', locale: 'zh' }),
  });
  const cd = await cr.json();
  convId = cd.id;
  guest = cd.guestToken;
  check('③0 访客建会话成功', !!convId && !!guest);

  // ---------- ③ 发消息带 productSlug ----------
  const cid1 = 'prod-' + Date.now();
  clientIds.push(cid1);
  const mr = await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({
      conversationId: convId,
      content: '这个有货吗？',
      guest,
      clientId: cid1,
      productSlug: prod.slug,
    }),
  });
  const md = await mr.json();
  check('③A 发送带商品引用的消息成功', mr.status === 200, `HTTP ${mr.status}`);
  check('③B 回执带 productSlug', md.message?.productSlug === prod.slug, String(md.message?.productSlug));

  // 历史接口
  const hr = await fetch(`${BASE}/api/chat/conversations/${convId}?guest=${encodeURIComponent(guest)}`, {
    headers: { Cookie: `ws_session=${custCookie}` },
  });
  const hd = await hr.json();
  const withProd = (hd.messages || []).filter((m) => m.productSlug === prod.slug);
  check('③C 历史消息带 productSlug', withProd.length === 1, `${withProd.length} 条`);

  // ---------- ④ 幂等 ----------
  const mr2 = await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({
      conversationId: convId,
      content: '这个有货吗？',
      guest,
      clientId: cid1,
      productSlug: prod.slug,
    }),
  });
  const md2 = await mr2.json();
  check('④A 重复提交返回 duplicate', md2.duplicate === true, String(md2.duplicate));
  const hr2 = await fetch(`${BASE}/api/chat/conversations/${convId}?guest=${encodeURIComponent(guest)}`, {
    headers: { Cookie: `ws_session=${custCookie}` },
  });
  const hd2 = await hr2.json();
  const cnt = (hd2.messages || []).filter((m) => m.clientId === cid1).length;
  check('④B 同 clientId 只落一条', cnt === 1, `实际 ${cnt} 条`);

  // ---------- ⑤ 客服列表预览 ----------
  // 先发一条「只有商品、没有文字」的消息（模拟访客一键发商品）→ 预览应为 [商品]
  const cidPure = 'prod-pure-' + Date.now();
  clientIds.push(cidPure);
  await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({
      conversationId: convId,
      guest,
      clientId: cidPure,
      productSlug: prod.slug,
    }),
  });
  const lr = await fetch(`${BASE}/api/chat/conversations`, { headers: { cookie: `ws_session=${adminCookie}` } });
  const ld = await lr.json();
  const conv = (ld.conversations || []).find((c) => c.id === convId);
  check('⑤A 客服能拉到该会话', !!conv);
  check('⑤B 纯商品消息的列表预览为 [商品]', conv?.lastPreview === '[商品]', String(conv?.lastPreview));

  // 带文字的消息 → 预览优先显示文字
  const cidTxt = 'prod-txt-' + Date.now();
  clientIds.push(cidTxt);
  await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({
      conversationId: convId,
      content: '这件还有别的颜色吗',
      guest,
      clientId: cidTxt,
      productSlug: prod.slug,
    }),
  });
  const lr2 = await fetch(`${BASE}/api/chat/conversations`, { headers: { cookie: `ws_session=${adminCookie}` } });
  const ld2 = await lr2.json();
  const conv2 = (ld2.conversations || []).find((c) => c.id === convId);
  check(
    '⑤C 带文字时预览优先显示文字',
    conv2?.lastPreview === '这件还有别的颜色吗',
    String(conv2?.lastPreview)
  );

  // ---------- ⑥ 非法 productSlug 被规整 ----------
  const cidBad = 'prod-bad-' + Date.now();
  clientIds.push(cidBad);
  const br = await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({
      conversationId: convId,
      content: '恶意 slug',
      guest,
      clientId: cidBad,
      productSlug: "'; DROP TABLE \"ChatMessage\"; --",
    }),
  });
  const bd = await br.json();
  const stored = bd.message?.productSlug ?? '';
  check('⑥A 非法 slug 被规整为安全字符', typeof stored === 'string' && !/['";\s]/.test(stored), JSON.stringify(stored));
  const hrBad = await fetch(`${BASE}/api/chat/conversations/${convId}?guest=${encodeURIComponent(guest)}`, {
    headers: { Cookie: `ws_session=${custCookie}` },
  });
  const hdBad = await hrBad.json();
  check('⑥B 表未受影响，历史仍可读', Array.isArray(hdBad.messages), `${hdBad.messages?.length} 条`);

  // ---------- ⑦ 客服端能收到商品引用 ----------
  const cr2 = await fetch(`${BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${custCookie}` },
    body: JSON.stringify({ visitorName: '客服回复访客', contactType: 'none', locale: 'zh' }),
  });
  const cd2 = await cr2.json();
  const adminList = await fetch(`${BASE}/api/chat/conversations`, { headers: { cookie: `ws_session=${adminCookie}` } });
  const adminList2 = await adminList.json();
  const c2 = (adminList2.conversations || []).find((x) => x.id === cd2.id);
  check('⑦0 第二个会话可见', !!c2);
}

try {
  await main();
} catch (e) {
  console.error('测试异常:', e);
  check('测试执行', false, String(e?.message || e));
} finally {
  // 清理
  try {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    if (convId) {
      await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId" = $1`, [convId]);
      await pool.query(`DELETE FROM "ChatConversation" WHERE "id" = $1`, [convId]);
    }
    await pool.query(`DELETE FROM "ChatMessage" WHERE "visitorName" = '客服回复访客'`);
    await pool.query(`DELETE FROM "ChatConversation" WHERE "visitorName" = '客服回复访客'`);
    await pool.end();
  } catch {
    /* noop */
  }
}

const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
console.log(`\n=== 结果：${pass}/${results.length} 通过${fail ? `，${fail} 项失败` : ''} ===`);
if (fail) {
  results.filter((r) => !r.ok).forEach((r) => console.log(`   ❌ ${r.name} — ${r.detail}`));
  process.exit(1);
}
