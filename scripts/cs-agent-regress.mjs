// 客服 H5 端到端回归测试（接口级）
//
// 覆盖：
//   ① 后台创建客服账号 → 登录成功
//   ② 密码错误 / 账号不存在 → 拒绝
//   ③ 商城 admin 账号不能登客服台；客服账号不能登后台
//   ④ 客服能拉会话列表、能读历史、能发消息
//   ⑤ 未读数按客服拆开：A 看了不影响 B 的红点
//   ⑥ 访客能收到客服回复（跨体系实时）
//   ⑦ 停用账号后立即无法登录
//   ⑧ CS 会话令牌不能当 ws_session 用（跨体系令牌重放）
import 'dotenv/config';
import crypto from 'crypto';
import { createRequire } from 'module';
import pg from 'pg';
import WebSocket from 'ws';

const require = createRequire(import.meta.url);
const BASE = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:4000';

for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'])
  delete process.env[k];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 从 set-cookie 头里提取指定 cookie（Node fetch 会用 ', ' 拼接多条，要小心） */
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'admin@shop.com', password: 'admin1234' }),
  });
  const sc = r.headers.get('set-cookie');
  return { ok: r.ok, cookie: getCookie(sc, 'ws_session') };
}

async function loginCs(username, password) {
  const r = await fetch(`${BASE}/api/cs/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const sc = r.headers.get('set-cookie');
  let body = {};
  try {
    body = await r.json();
  } catch {
    /* noop */
  }
  return { status: r.status, cookie: getCookie(sc, 'cs_session'), body };
}

async function createAgent(username, password, displayName) {
  const { cookie } = await loginAdmin();
  const r = await fetch(`${BASE}/api/admin/support-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${cookie}` },
    body: JSON.stringify({ username, password, displayName }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function patchAgent(id, patch, adminCookie) {
  const r = await fetch(`${BASE}/api/admin/support-agents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: `ws_session=${adminCookie}` },
    body: JSON.stringify(patch),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

/** 打开一条 WS 连接，等到 authed */
function openWs(authMsg, headers = {}) {
  return new Promise((resolve, reject) => {
    // ⚠️ ws 库签名：new WebSocket(url, protocols, options)
    //    options 必须放第三个参数，放第二个会被当 protocols → headers 不生效。
    const ws = new WebSocket(WS_URL, [], { headers });
    const timer = setTimeout(() => reject(new Error('ws auth timeout')), 8000);
    ws.on('open', () => ws.send(JSON.stringify(authMsg)));
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'authed') {
        clearTimeout(timer);
        resolve(ws);
      }
      if (m.type === 'error' && m.message === 'FORBIDDEN') {
        clearTimeout(timer);
        reject(new Error('FORBIDDEN'));
      }
    });
    ws.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

/** 建一个访客会话并发一条消息 */
async function createVisitorConversation(content) {
  const r = await fetch(`${BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorName: '回归访客', contactType: 'email', contact: 't@t.com', locale: 'zh' }),
  });
  const conv = await r.json();
  const cr = await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: conv.id, guest: conv.guestToken, content }),
  });
  const msg = await cr.json();
  return { convId: conv.id, guestToken: conv.guestToken, messageId: msg.message?.id };
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = Date.now();
  const ua = `regress_a_${stamp}`;
  const ub = `regress_b_${stamp}`;
  const pwd = 'regress123';

  console.log('=== 客服 H5 回归测试 ===\n');

  // ---------- ① 后台建号 ----------
  const admin = await loginAdmin();
  check('①A 后台管理员登录成功', admin.ok && !!admin.cookie, `cookie 长度 ${admin.cookie.length}`);

  const ca = await createAgent(ua, pwd, '客服A');
  const cb = await createAgent(ub, pwd, '客服B');
  check('①B 后台创建客服账号 A', ca.status === 200 && !!ca.body.agent?.id, JSON.stringify(ca.body).slice(0, 80));
  check('①C 后台创建客服账号 B', cb.status === 200 && !!cb.body.agent?.id);
  const idA = ca.body.agent?.id;
  const idB = cb.body.agent?.id;

  // 重复账号应被拒
  const dup = await createAgent(ua, pwd, '重复');
  check('①D 重复账号被拒绝', dup.status === 409, `status=${dup.status}`);

  // 弱密码应被拒
  const weak = await createAgent(`regress_w_${stamp}`, '123', '弱密码');
  check('①E 弱密码被拒绝', weak.status === 400, `status=${weak.status}`);

  // ---------- ② 登录 ----------
  const la = await loginCs(ua, pwd);
  const lb = await loginCs(ub, pwd);
  check('②A 客服 A 登录成功', la.status === 200 && !!la.cookie, `cookie 长度 ${la.cookie.length}`);
  check('②B 客服 B 登录成功', lb.status === 200 && !!lb.cookie);

  const badPw = await loginCs(ua, 'wrongpass');
  check('②C 密码错误被拒绝', badPw.status === 401, `status=${badPw.status}`);
  const noUser = await loginCs('nosuchuser_xyz', 'x');
  check('②D 账号不存在被拒绝', noUser.status === 401);

  // ---------- ③ 跨体系隔离 ----------
  const adminAsCs = await loginCs('admin@shop.com', 'admin1234');
  check('③A 商城 admin 不能登客服台', adminAsCs.status === 401, `status=${adminAsCs.status}`);

  // 客服 Cookie 不能访问后台管理接口
  const r = await fetch(`${BASE}/api/admin/support-agents`, {
    headers: { Cookie: `cs_session=${la.cookie}` },
  });
  check('③B 客服 Cookie 不能访问后台管理接口', r.status === 401 || r.status === 403, `status=${r.status}`);

  // 客服 Cookie 不能访问商城用户管理接口
  const r2 = await fetch(`${BASE}/api/admin/customers`, {
    headers: { Cookie: `cs_session=${la.cookie}` },
  });
  check('③C 客服 Cookie 不能访问商城客户管理', r2.status === 401 || r2.status === 403, `status=${r2.status}`);

  // 客服 Cookie 不能进商城前台下单接口
  const r3 = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `cs_session=${la.cookie}` },
    body: JSON.stringify({}),
  });
  check('③D 客服 Cookie 不能下商城订单', r3.status === 401 || r3.status === 403 || r3.status === 400, `status=${r3.status}`);

  // ---------- ⑧ 跨体系令牌重放 ----------
  // 真实威胁不是"伪造"（能拿到 AUTH_SECRET 就能签任何东西，那本来就是全面失守），
  // 而是"拿 A 体系的合法令牌去当 B 体系用"。
  // ⑧A：cs_session 的令牌当 ws_session 用（客服想冒充后台管理员）
  try {
    await openWs({ type: 'auth', role: 'admin' }, { Cookie: `ws_session=${la.cookie}` });
    check('⑧A 客服令牌不能当后台管理员用', false, '居然连上了');
  } catch (e) {
    check('⑧A 客服令牌不能当后台管理员用', true, e.message);
  }

  // ⑧B：ws_session 的令牌当 cs_session 用（管理员想冒充客服）
  try {
    const ws = await openWs({ type: 'auth', role: 'agent' }, { Cookie: `cs_session=${admin.cookie}` });
    ws.close();
    check('⑧B 管理员令牌不能当客服令牌用', false, '居然连上了');
  } catch (e) {
    check('⑧B 管理员令牌不能当客服令牌用', true, e.message);
  }

  // ⑧C：管理员的短时 WS 令牌也不能当客服令牌用
  const adminShortTok = await (await fetch(`${BASE}/api/chat/ws-token`, {
    headers: { Cookie: `ws_session=${admin.cookie}` },
  })).json();
  try {
    const ws = await openWs({ type: 'auth', role: 'agent' });
    ws.close();
    check('⑧C 无凭证的 agent 连接被拒绝', false, '居然连上了');
  } catch (e) {
    check('⑧C 无凭证的 agent 连接被拒绝', true, e.message);
  }
  check(
    '⑧D 管理员短时令牌 role 正确',
    adminShortTok.role === 'admin',
    `role=${adminShortTok.role}`
  );

  // ---------- ④ 客服能读写会话 ----------
  const { convId, guestToken } = await createVisitorConversation('访客第一条消息');

  const listA = await fetch(`${BASE}/api/chat/conversations`, {
    headers: { Cookie: `cs_session=${la.cookie}` },
  });
  const listDataA = await listA.json();
  check('④A 客服能拉会话列表', listA.ok && Array.isArray(listDataA.conversations), `${listDataA.conversations?.length} 个会话`);

  const convA = (listDataA.conversations || []).find((c) => c.id === convId);
  check('④B 新会话出现在客服列表', !!convA);
  check('④C 未读数按客服计算（初始为 1）', convA?.unreadAdmin === 1, `实际 ${convA?.unreadAdmin}`);

  const histA = await fetch(`${BASE}/api/chat/conversations/${convId}`, {
    headers: { Cookie: `cs_session=${la.cookie}` },
  });
  const histDataA = await histA.json();
  check('④D 客服能读会话历史', histA.ok && histDataA.messages?.length === 1, `${histDataA.messages?.length} 条`);

  // 客服发消息（REST 兜底路径）
  const sendA = await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `cs_session=${la.cookie}` },
    body: JSON.stringify({ conversationId: convId, content: '客服A的回复', clientId: 'cs-test-1' }),
  });
  const sendDataA = await sendA.json();
  check('④E 客服能发消息', sendA.ok && !!sendDataA.message?.id, JSON.stringify(sendDataA).slice(0, 80));

  // 幂等
  const sendAgain = await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `cs_session=${la.cookie}` },
    body: JSON.stringify({ conversationId: convId, content: '客服A的回复', clientId: 'cs-test-1' }),
  });
  const againData = await sendAgain.json();
  check('④F 重复 clientId 不重复落库', againData.duplicate === true || againData.message?.id === sendDataA.message?.id);

  // ---------- ⑤ 未读按客服拆开 ----------
  // A 打开会话 → A 的未读清零
  const readA = await fetch(`${BASE}/api/chat/conversations/${convId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: `cs_session=${la.cookie}` },
    body: JSON.stringify({ read: true }),
  });
  check('⑤A 客服标记已读成功', readA.ok);

  const listA2 = await fetch(`${BASE}/api/chat/conversations`, {
    headers: { Cookie: `cs_session=${la.cookie}` },
  });
  const listDataA2 = await listA2.json();
  const convA2 = (listDataA2.conversations || []).find((c) => c.id === convId);
  check('⑤B A 的未读已清零', convA2?.unreadAdmin === 0, `实际 ${convA2?.unreadAdmin}`);

  const listB = await fetch(`${BASE}/api/chat/conversations`, {
    headers: { Cookie: `cs_session=${lb.cookie}` },
  });
  const listDataB = await listB.json();
  const convB = (listDataB.conversations || []).find((c) => c.id === convId);
  check('⑤C B 的未读仍为 1（未被 A 影响）', convB?.unreadAdmin === 1, `实际 ${convB?.unreadAdmin}`);

  // 后台管理员也应有独立未读
  const listAdmin = await fetch(`${BASE}/api/chat/conversations`, {
    headers: { Cookie: `ws_session=${admin.cookie}` },
  });
  const listDataAdmin = await listAdmin.json();
  const convAdmin = (listDataAdmin.conversations || []).find((c) => c.id === convId);
  check('⑤D 后台管理员未读独立计算', convAdmin?.unreadAdmin === 1, `实际 ${convAdmin?.unreadAdmin}`);

  // ---------- ⑥ 访客实时收到客服回复 ----------
  const visitor = await openWs(
    { type: 'auth', role: 'visitor', conversationId: convId, guestToken },
    {}
  );
  let visitorGot = null;
  visitor.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.type === 'message' && m.message?.content === 'WS实时回复') visitorGot = m.message;
  });
  await sleep(400);

  // A 通过 WS 发消息
  const agentA = await openWs({ type: 'auth', role: 'agent' }, { Cookie: `cs_session=${la.cookie}` });
  check('⑥A 客服通过 CS Cookie 完成 WS 鉴权', true);

  // 短时令牌也要能用
  const tokRes = await fetch(`${BASE}/api/chat/ws-token`, { headers: { Cookie: `cs_session=${la.cookie}` } });
  const tokData = await tokRes.json();
  check('⑥B 客服能取 WS 短时令牌', tokRes.ok && tokData.role === 'agent', `role=${tokData.role}`);

  await sleep(300);
  agentA.send(
    JSON.stringify({
      type: 'message',
      conversationId: convId,
      content: 'WS实时回复',
      clientId: 'cs-ws-1',
    })
  );
  await sleep(1500);
  check('⑥C 访客实时收到客服 WS 回复', !!visitorGot, visitorGot ? visitorGot.content : '未收到');

  // 客服 WS 收到访客新消息
  let agentGot = null;
  agentA.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.type === 'message' && m.message?.content === '访客第二条') agentGot = m.message;
  });
  await fetch(`${BASE}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: convId, guest: guestToken, content: '访客第二条', clientId: 'cs-v2' }),
  });
  await sleep(1500);
  check('⑥D 客服实时收到访客新消息', !!agentGot, agentGot ? agentGot.content : '未收到');

  // ---------- ⑦ 停用账号 ----------
  const dis = await patchAgent(idA, { active: false }, admin.cookie);
  check('⑦A 停用客服账号成功', dis.status === 200 && dis.body.agent?.active === false);

  const laAfter = await loginCs(ua, pwd);
  check('⑦B 停用后立即无法登录', laAfter.status === 403, `status=${laAfter.status}`);

  // 已停用账号的旧 Cookie 也应失效
  const listAfterDisable = await fetch(`${BASE}/api/chat/conversations`, {
    headers: { Cookie: `cs_session=${la.cookie}` },
  });
  check('⑦C 停用后旧会话失效', listAfterDisable.status === 401 || listAfterDisable.status === 403, `status=${listAfterDisable.status}`);

  // ---------- 清理 ----------
  await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId" = $1`, [convId]);
  await pool.query(`DELETE FROM "ChatConversation" WHERE "id" = $1`, [convId]);
  await pool.query(`DELETE FROM "ChatReadCursor" WHERE "staffId" LIKE 'agent:%'`);
  await pool.query(`DELETE FROM "ChatAgent" WHERE "username" IN ($1, $2)`, [ua, ub]);
  await pool.end();

  visitor.close();
  agentA.close();

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
