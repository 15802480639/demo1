// 全链路实时测试：Next REST 建会话 → 游客 WS 发 → 管理员 WS(真实登录token) 实时收到 → 落库
import 'dotenv/config';
import crypto from 'crypto';
import pg from 'pg';
import WebSocket from 'ws';

const BASE = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:4000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) { console.log('缺少 ADMIN_TOKEN'); process.exit(1); }
console.log('start, token len', ADMIN_TOKEN.length);

// 禁用代理，避免 127.0.0.1 被代理拦截
for (const k of ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy']) delete process.env[k];

function open(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.on('open', () => res(ws));
    ws.on('error', rej);
  });
}

// 1) 经 Next 建会话
const created = await fetch(`${BASE}/api/chat/conversations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ visitorName: '실시간테스트', contactType: 'none', locale: 'ko' }),
}).then((r) => r.json());
console.log('1) 建会话:', created.id?.slice(0, 8), created.guestToken ? 'OK' : 'FAIL');
const { id, guestToken } = created;

const adminEvents = [];
const visitorEvents = [];

const adminWs = await open(WS_URL);
adminWs.on('message', (d) => adminEvents.push(JSON.parse(d.toString())));
adminWs.send(JSON.stringify({ type: 'auth', role: 'admin', token: ADMIN_TOKEN }));
await new Promise((r) => setTimeout(r, 300));

const visitorWs = await open(WS_URL);
visitorWs.on('message', (d) => visitorEvents.push(JSON.parse(d.toString())));
visitorWs.send(JSON.stringify({ type: 'auth', role: 'visitor', conversationId: id, guestToken }));
await new Promise((r) => setTimeout(r, 300));

// 2) 游客经 WS 发消息
visitorWs.send(JSON.stringify({ type: 'message', content: '실시간 메시지 테스트', clientId: 'x1' }));
await new Promise((r) => setTimeout(r, 600));

const adminGot = adminEvents.find((e) => e.type === 'message' && e.message?.content === '실시간 메시지 테스트');
console.log('2) 管理员 WS 实时收到游客消息:', !!adminGot ? '✅' : '❌');

// 3) 管理员经 WS 回复
adminWs.send(JSON.stringify({ type: 'message', conversationId: id, content: '네, 확인했습니다', clientId: 'x2' }));
await new Promise((r) => setTimeout(r, 600));
const visitorGot = visitorEvents.find((e) => e.type === 'message' && e.message?.content === '네, 확인했습니다');
console.log('3) 游客 WS 实时收到客服回复:', !!visitorGot ? '✅' : '❌');

// 4) 库里落库校验
const u = new URL(process.env.DATABASE_URL);
const pool = new pg.Pool({ host: u.hostname, port: Number(u.port || 5432), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.replace(/^\//, '') });
const cnt = (await pool.query(`SELECT COUNT(*)::int n FROM "ChatMessage" WHERE "conversationId"=$1`, [id])).rows[0].n;
console.log('4) 库内消息条数:', cnt, cnt === 2 ? '✅' : '❌');

// 5) 管理员列表经 REST 应显示未读/预览
const list = await fetch(`${BASE}/api/chat/conversations`, { headers: { Cookie: `ws_session=${ADMIN_TOKEN}` } }).then((r) => r.json());
const inList = (list.conversations || []).find((c) => c.id === id);
console.log('5) REST 列表含该会话:', !!inList ? '✅' : '❌', '| 未读:', inList?.unreadAdmin, '| 预览:', inList?.lastPreview);

// 清理
await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId"=$1`, [id]);
await pool.query(`DELETE FROM "ChatConversation" WHERE "id"=$1`, [id]);
await pool.end();
console.log('清理完成 ✅ 全链路实时通过');
