// 验证：后台(admin WS)发消息 → 前台游客(visitor WS)是否秒收（实时方向）
import 'dotenv/config';
import WebSocket from 'ws';

const BASE = 'http://127.0.0.1:3000';
const WS = 'ws://127.0.0.1:4000';

function getCookie(name, header) {
  const m = header.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

async function createConv() {
  const r = await fetch(`${BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorName: 'RT测试', contactType: 'none', locale: 'ko' }),
  });
  return r.json();
}

function openWs(role, auth) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', role, ...auth })));
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'authed') resolve(ws);
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('ws auth timeout')), 5000);
  });
}

async function main() {
  const conv = await createConv();
  console.log('conv id:', conv.id, 'guest:', conv.guestToken.slice(0, 8) + '…');

  // 游客 WS
  const vws = await openWs('visitor', { conversationId: conv.id, guestToken: conv.guestToken });
  let visitorGot = null;
  vws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.type === 'message') {
      visitorGot = m.message;
      console.log('  [游客WS 实时收到]', m.message.sender, ':', m.message.content);
    }
  });

  // 管理员 WS（用真实登录 token）
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'admin@shop.com', password: 'admin1234' }),
  });
  const setCookie = login.headers.get('set-cookie') || '';
  const token = getCookie('ws_session', setCookie);
  console.log('admin token len:', token.length);

  const aw = await openWs('admin', { token });
  // 后台发消息
  await new Promise((r) => setTimeout(r, 300));
  aw.send(JSON.stringify({ type: 'message', conversationId: conv.id, content: '你好，这是后台即时回复', clientId: 'c-test' }));
  console.log('  [后台WS 已发送]');

  await new Promise((r) => setTimeout(r, 1200));
  if (visitorGot && visitorGot.content === '你好，这是后台即时回复') {
    console.log('✅ 实时方向 OK：后台回复前台秒收');
  } else {
    console.log('❌ 实时方向 FAIL：前台未在 WS 收到后台回复');
  }

  // 顺便验证 REST 历史能取到（轮询兜底依据）
  const hist = await fetch(`${BASE}/api/chat/conversations/${conv.id}?guest=${conv.guestToken}`);
  const hd = await hist.json();
  console.log('  [REST 历史条数]', hd.messages?.length, hd.messages?.map((m) => m.sender + ':' + m.content).join(' | '));

  // 清理
  const { Pool } = await import('pg');
  const u = new URL(process.env.DATABASE_URL);
  const pool = new Pool({ host: u.hostname, port: Number(u.port || 5432), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.replace(/^\//, '') });
  await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId"=$1`, [conv.id]);
  await pool.query(`DELETE FROM "ChatConversation" WHERE "id"=$1`, [conv.id]);
  await pool.end();
  console.log('🧹 测试数据已清理');
  process.exit(0);
}
main().catch((e) => { console.error('ERR', e); process.exit(1); });
