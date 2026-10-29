// 访客登录门槛 + 客户名称=注册账号名 —— 接口级回归
//
// 需求（子建 2026-10-29）：
//   ① 客户使用实时客服前必须已注册并登录商城
//   ② 未登录 → 不能建会话、不能发消息、不能读历史
//   ③ 登录后聊天里显示的客户名称 = 注册账号名
//   ④ 换账号不能看到上一个账号的会话
//
// 运行：node scripts/chat-login-gate-regress.mjs
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const WS_URL = BASE.replace(/^http/, 'ws') + ':4000'.replace(BASE.match(/:\d+$/)?.[0] || '');
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

async function j(method, path, { body, cookie } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 120) };
  }
  return { status: r.status, data, headers: r.headers };
}

/** 注册一个测试会员（拿不到就退化成用已存在的） */
async function registerUser(username) {
  const password = 'test1234';
  const r = await j('POST', '/api/auth/register', {
    body: { username, password, name: `昵称${username}` },
  });
  if (r.status === 200 || r.status === 409) {
    const lr = await j('POST', '/api/auth/login', { body: { account: username, password } });
    if (lr.status === 200) {
      const sc = lr.headers?.get?.('set-cookie');
      return { ok: true, cookie: getCookie(sc, 'ws_session'), username };
    }
  }
  return { ok: false, username };
}

async function main() {
  console.log(`\n===== 访客登录门槛回归（${BASE}）=====\n`);

  const stamp = Date.now().toString(36);
  const userA = `gate_a_${stamp}`;
  const userB = `gate_b_${stamp}`;

  // ---------- ① 未登录建会话 → 401 ----------
  const anon = await j('POST', '/api/chat/conversations', {
    body: { contactType: 'none', locale: 'ko', visitorName: '匿名访客' },
  });
  check('①A 未登录建会话被拒（401）', anon.status === 401, `status=${anon.status}`);
  check('①B 返回 AUTH_REQUIRED', anon.data?.error === 'AUTH_REQUIRED', String(anon.data?.error));

  // ---------- ② 注册并登录 ----------
  const A = await registerUser(userA);
  check('②A 测试会员 A 注册登录成功', A.ok, A.ok ? userA : '失败');
  const B = await registerUser(userB);
  check('②B 测试会员 B 注册登录成功', B.ok, B.ok ? userB : '失败');
  if (!A.ok) {
    console.log('\n无法注册测试会员，后续用例跳过');
    summary();
    return;
  }

  // ---------- ③ 登录后建会话成功 ----------
  const conv = await j('POST', '/api/chat/conversations', {
    body: { contactType: 'email', contact: 'a@example.com', locale: 'ko' },
    cookie: `ws_session=${A.cookie}`,
  });
  check('③A 登录后建会话成功（200）', conv.status === 200, `status=${conv.status}`);
  const convId = conv.data?.id;
  const guestToken = conv.data?.guestToken;
  check('③B 返回会话 id 与 guestToken', !!convId && !!guestToken);

  // ---------- ④ 会话绑定了 userId，名称 = 注册账号名 ----------
  const admin = await j('POST', '/api/auth/login', {
    body: { account: 'admin@shop.com', password: 'admin1234' },
  });
  const adminCookie = getCookie(admin.headers?.get?.('set-cookie'), 'ws_session');
  check('④A 管理员登录成功', admin.status === 200 && !!adminCookie);

  const list = await j('GET', '/api/chat/conversations', { cookie: `ws_session=${adminCookie}` });
  const row = (list.data?.conversations || []).find((c) => c.id === convId);
  check('④B 会话出现在客服列表', !!row);
  check(
    '④C 客户名称 = 注册账号名',
    row?.visitorName === userA,
    `visitorName=${row?.visitorName} 期望=${userA}`
  );
  check(
    '④D 关联了登录用户（user.username）',
    row?.user?.username === userA,
    `user.username=${row?.user?.username}`
  );

  // ---------- ⑤ 访客发消息：本人允许 ----------
  const sent = await j('POST', '/api/chat/messages', {
    body: { conversationId: convId, content: '你好，我想问下这个商品的尺码', guest: guestToken },
    cookie: `ws_session=${A.cookie}`,
  });
  check('⑤A 会话归属用户发消息成功', sent.status === 200, `status=${sent.status}`);

  // ---------- ⑥ 换账号不能读写别人的会话 ----------
  const bRead = await j('GET', `/api/chat/conversations/${convId}?guest=${guestToken}`, {
    cookie: `ws_session=${B.cookie}`,
  });
  check('⑥A 其他账号读历史被拒（403）', bRead.status === 403, `status=${bRead.status}`);

  const bSend = await j('POST', '/api/chat/messages', {
    body: { conversationId: convId, content: '我要插话', guest: guestToken },
    cookie: `ws_session=${B.cookie}`,
  });
  check('⑥B 其他账号发消息被拒（403）', bSend.status === 403, `status=${bSend.status}`);

  // ⚠️ 换账号时若带上会话的 guestToken（同一浏览器换了账号）
  //    → 仍然必须被拒（guestToken 只对「无归属」的游客会话有效）
  const bSendWithGuest = await j('POST', '/api/chat/messages', {
    body: { conversationId: convId, content: '拿着 guestToken 也不行', guest: guestToken },
    cookie: `ws_session=${B.cookie}`,
  });
  check(
    '⑥C 拿着 guestToken 也无法冒用他人会话（403）',
    bSendWithGuest.status === 403,
    `status=${bSendWithGuest.status}`
  );

  // ---------- ⑦ 未登录发消息被拒 ----------
  const anonSend = await j('POST', '/api/chat/messages', {
    body: { conversationId: convId, content: '匿名插话', guest: guestToken },
  });
  check('⑦A 未登录发消息被拒（403）', anonSend.status === 403, `status=${anonSend.status}`);

  const anonRead = await j('GET', `/api/chat/conversations/${convId}?guest=${guestToken}`);
  check('⑦B 未登录读历史被拒（403）', anonRead.status === 403, `status=${anonRead.status}`);

  // ---------- ⑧ 客服侧不受影响 ----------
  const staffRead = await j('GET', `/api/chat/conversations/${convId}`, {
    cookie: `ws_session=${adminCookie}`,
  });
  check('⑧A 管理员仍能读会话', staffRead.status === 200, `status=${staffRead.status}`);
  check(
    '⑧B 管理员读到 1 条访客消息',
    (staffRead.data?.messages || []).filter((m) => m.sender === 'visitor').length === 1,
    `visitor 消息数=${(staffRead.data?.messages || []).filter((m) => m.sender === 'visitor').length}`
  );

  // ---------- ⑨ 未登录时客服列表仍然正常（历史游客会话不该被影响） ----------
  check(
    '⑨A 客服列表接口正常返回',
    list.status === 200 && Array.isArray(list.data?.conversations),
    `status=${list.status}`
  );

  // ---------- ⑩ 清理：删掉测试会话 ----------
  try {
    const { Pool } = await import('pg');
    const { default: dotenv } = await import('dotenv');
    dotenv.config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`DELETE FROM "ChatConversation" WHERE "id" = $1`, [convId]);
    await pool.query(`DELETE FROM "User" WHERE "username" = ANY($1)`, [[userA, userB]]);
    await pool.end();
    console.log('\n🧹 测试数据已清理');
  } catch (e) {
    console.log('\n⚠️ 清理失败：', String(e).slice(0, 100));
  }

  summary();
}

function summary() {
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
