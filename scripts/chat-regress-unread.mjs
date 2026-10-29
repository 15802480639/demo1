// 客服 IM 专项回归：验证本轮修复的四个根因
//   ① admin WS 鉴权（Cookie 握手 + 短时令牌 两条路都要通）
//   ② 后台会话列表轮询刷新（新会话/新消息几秒内出现）
//   ③ 点开会话后未读数归零（写库 + 界面口径一致）
//   ④ REST 兜底落库后 WS 广播（对方秒收，不靠轮询）
import 'dotenv/config';
import WebSocket from 'ws';
import { Pool } from 'pg';
import { loginTestCustomer } from './chat-test-user.mjs';

const BASE = 'http://127.0.0.1:3000';
const WS = 'ws://127.0.0.1:4000';
const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

function getCookie(name, header) {
  const m = header.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function openWs(authMsg, opts = {}) {
  return new Promise((resolve, reject) => {
    // ⚠️ ws 库签名：new WebSocket(address, protocols, options)
    //    options 必须放第三个参数，第二个是 protocols（放错位置 headers 不生效）
    const ws = opts.headers
      ? new WebSocket(WS, [], { headers: opts.headers })
      : new WebSocket(WS);
    const timer = setTimeout(() => reject(new Error('ws auth timeout')), 6000);
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

async function loginAdmin() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'admin@shop.com', password: 'admin1234' }),
  });
  const sc = r.headers.get('set-cookie') || '';
  return { cookie: getCookie('ws_session', sc), setCookie: sc };
}

// ⚠️ 访客必须已登录才能建会话（2026-10-29 起）
async function createConv(name, cookie) {
  const r = await fetch(`${BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: `ws_session=${cookie}` } : {}) },
    body: JSON.stringify({ contactType: 'none', locale: 'ko' }),
  });
  return r.json();
}

async function listAsAdmin(cookie) {
  const r = await fetch(`${BASE}/api/chat/conversations`, {
    headers: { Cookie: `ws_session=${cookie}` },
    cache: 'no-store',
  });
  return r.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const created = [];

  try {
    const { cookie, setCookie } = await loginAdmin();
    check('管理员登录拿到 ws_session', !!cookie, `len=${cookie.length}`);

    // ---------- ①A：Cookie 握手鉴权（不传 token，只带 Cookie 头） ----------
    let cookieAuthOk = false;
    let cookieErr = '';
    try {
      const ws = await openWs({ type: 'auth', role: 'admin' }, { headers: { Cookie: `ws_session=${cookie}` } });
      cookieAuthOk = ws.readyState === WebSocket.OPEN;
      ws.close();
    } catch (e) {
      cookieErr = e.message;
    }
    check('①A admin WS 用 Cookie 握手鉴权成功', cookieAuthOk, cookieErr);

    // ---------- ①B：短时令牌鉴权 ----------
    const tokRes = await fetch(`${BASE}/api/chat/ws-token`, {
      headers: { Cookie: `ws_session=${cookie}` },
      cache: 'no-store',
    });
    const tokData = tokRes.json ? await tokRes.json() : {};
    let tokenAuthOk = false;
    let tokenErr = '';
    if (tokData.token) {
      try {
        const ws = await openWs({ type: 'auth', role: 'admin', token: tokData.token });
        tokenAuthOk = ws.readyState === WebSocket.OPEN;
        ws.close();
      } catch (e) {
        tokenErr = e.message;
      }
    }
    check('①B admin WS 用短时令牌鉴权成功', tokenAuthOk, tokData.token ? '' : 'ws-token 接口未返回令牌');

    // 无任何凭证 → 必须被拒
    let rejected = false;
    try {
      const ws = await openWs({ type: 'auth', role: 'admin' });
      ws.close();
    } catch {
      rejected = true;
    }
    check('①C 无凭证的 admin 连接被拒绝', rejected);

    // ---------- 建立真实的 admin + visitor 连接 ----------
    const adminWs = await openWs({ type: 'auth', role: 'admin', token: tokData.token });

    // ⚠️ 访客侧现在必须带登录态：建会话要 cookie，WS 握手也要 cookie
    //    （会话已绑定 userId → 服务端校验「登录用户 == 会话归属用户」）
    const cust = await loginTestCustomer('im');
    const conv = await createConv('专项回归访客', cust.cookie);
    check('①D 访客登录后建会话成功', !!conv?.id, conv?.error || '');
    created.push(conv.id);
    const visitorWs = await openWs(
      {
        type: 'auth',
        role: 'visitor',
        conversationId: conv.id,
        guestToken: conv.guestToken,
      },
      { headers: { Cookie: `ws_session=${cust.cookie}` } }
    );

    let adminGotMsg = null;
    let adminGotConvUpdate = null;
    adminWs.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'message') adminGotMsg = m;
      if (m.type === 'convUpdate') adminGotConvUpdate = m;
    });

    // ---------- ②：访客发消息 → admin WS 实时收到 ----------
    const cid = 'c-regress-1';
    visitorWs.send(JSON.stringify({ type: 'message', content: '访客第一条消息', clientId: cid }));
    await sleep(1200);
    check(
      '②A admin WS 实时收到访客消息',
      !!adminGotMsg && adminGotMsg.conversationId === conv.id && adminGotMsg.message.content === '访客第一条消息'
    );
    check(
      '②B admin 收到 convUpdate（列表未读数/预览刷新）',
      !!adminGotConvUpdate && adminGotConvUpdate.conversationId === conv.id,
      adminGotConvUpdate ? `unreadAdmin=${adminGotConvUpdate.unreadAdmin}` : ''
    );

    // ---------- ②C：列表接口能看到新会话与未读数 ----------
    const list1 = await listAsAdmin(cookie);
    const c1 = (list1.conversations || []).find((c) => c.id === conv.id);
    check('②C 列表接口返回新会话', !!c1);
    check('②D 新会话未读数为 1', c1 && c1.unreadAdmin === 1, c1 ? `实际=${c1.unreadAdmin}` : '会话不存在');

    // ---------- ③：标记已读 → 未读数归零（写库口径） ----------
    const patch = await fetch(`${BASE}/api/chat/conversations/${conv.id}`, {
      method: 'PATCH',
      headers: { Cookie: `ws_session=${cookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    await sleep(400);
    const list2 = await listAsAdmin(cookie);
    const c2 = (list2.conversations || []).find((c) => c.id === conv.id);
    check('③A PATCH 已读返回 ok', patch.ok);
    check('③B 已读后未读数归零', c2 && c2.unreadAdmin === 0, c2 ? `实际=${c2.unreadAdmin}` : '');

    // ---------- ④：REST 兜底落库 → WS 广播给 admin ----------
    let restBroadcast = null;
    const onMsg = (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'message' && m.message?.content === 'REST兜底消息') restBroadcast = m;
    };
    adminWs.on('message', onMsg);

    // 访客侧也要收到 admin 的 REST 兜底消息（访客不轮询时的真实路径）
    let visitorGotRest = null;
    visitorWs.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'message' && m.message?.content === 'REST兜底消息') visitorGotRest = m;
    });

    // 用 admin 身份走 REST 发消息（模拟 WS 断线兜底路径）
    const restRes = await fetch(`${BASE}/api/chat/messages`, {
      method: 'POST',
      headers: { Cookie: `ws_session=${cookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conv.id,
        content: 'REST兜底消息',
        clientId: 'c-regress-rest',
      }),
    });
    const restData = await restRes.json();
    await sleep(1500);
    check('④A REST 兜底接口返回成功', restRes.ok && !!restData.message?.id);
    check(
      '④B REST 落库后 WS 广播出去（admin 秒收）',
      !!restBroadcast && restBroadcast.message.content === 'REST兜底消息'
    );
    check(
      '④B2 REST 落库后 WS 广播出去（访客秒收）',
      !!visitorGotRest && visitorGotRest.message.content === 'REST兜底消息'
    );

    // ---------- ④C：REST 幂等（同 clientId 不重复落库） ----------
    await fetch(`${BASE}/api/chat/messages`, {
      method: 'POST',
      // ⚠️ 必须用访客 cookie：admin 的 cookie 会被判定为客服身份
      headers: { Cookie: `ws_session=${cust.cookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conv.id,
        content: 'REST兜底消息',
        guest: conv.guestToken,
        clientId: 'c-regress-rest',
      }),
    });
    await sleep(500);
    const hist = await fetch(`${BASE}/api/chat/conversations/${conv.id}?guest=${conv.guestToken}`, {
      headers: { Cookie: `ws_session=${cust.cookie}` },
    });
    const hd = await hist.json();
    const dupCount = (hd.messages || []).filter((m) => m.content === 'REST兜底消息').length;
    check('④C 幂等：同 clientId 只落一条', dupCount === 1, `实际=${dupCount}`);

    // ---------- 顺序检查：visitor 首条 → admin 回复，严格穿插 ----------
    const order = (hd.messages || []).map((m) => m.sender);
    check(
      '⑤ 消息顺序严格按发送先后',
      JSON.stringify(order) === JSON.stringify(['visitor', 'admin']),
      order.join(' → ')
    );

    visitorWs.close();
    adminWs.close();
  } catch (e) {
    check('测试执行异常', false, e?.message || String(e));
  } finally {
    for (const id of created) {
      await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId"=$1`, [id]);
      await pool.query(`DELETE FROM "ChatConversation" WHERE "id"=$1`, [id]);
    }
    await pool.end();
    console.log('🧹 测试数据已清理');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n===== 结果：${results.length - failed.length}/${results.length} 通过 =====`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL: ${f.name} ${f.detail}`));
    process.exit(1);
  }
  process.exit(0);
}

main();
