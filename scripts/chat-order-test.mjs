// 完整验证：访客/客服交替发 4 条
//  1) admin 的消息是否真的落库（此前 bug：未带 conversationId 被服务端丢弃）
//  2) WS 推送与 REST 返回的 createdAt 是否一致（此前 bug：时区差 8 小时）
//  3) 前端排序（按 seq）是否严格按发生顺序交错
//  4) 幂等：同 clientId 重复提交是否只落一条
import 'dotenv/config';
import WebSocket from 'ws';
import pg from 'pg';

const BASE = 'http://127.0.0.1:3000';
const WS = 'ws://127.0.0.1:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(path, opts) {
  const res = await fetch(BASE + path, { ...opts, cache: 'no-store' });
  return res.json();
}

// 登录拿 admin token
const lr = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: 'admin@shop.com', password: 'admin1234' }),
});
const setCookie = lr.headers.get('set-cookie') || '';
const token = (setCookie.match(/ws_session=([^;]+)/) || [])[1];
if (!token) throw new Error('拿不到 admin token');
console.log('admin token ok');

function wsConnect(role, auth) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', role, ...auth })));
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.type === 'authed') resolve(ws);
      if (m.type === 'error') reject(new Error(m.message));
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('ws timeout')), 4000);
  });
}

// 1) 建会话
const conv = await rest('/api/chat/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ visitorName: '顺序测试访客', contactType: 'none', locale: 'ko' }),
});
const cid = conv.id;
const guest = conv.guestToken;
console.log('会话已建:', cid);

const vWs = await wsConnect('visitor', { conversationId: cid, guestToken: guest });
const aWs = await wsConnect('admin', { token });
await sleep(200);

// 收集 WS 推送的 createdAt（验证 WS 与 REST 返回的是同一绝对时刻）
const wsTimes = new Map(); // content -> createdAt
vWs.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'message' && m.message?.content) {
    wsTimes.set(m.message.content, m.message.createdAt);
  }
});
aWs.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'message' && m.message?.content) {
    wsTimes.set(m.message.content, m.message.createdAt);
  }
});

// 2) 交替发 4 条 —— admin 这次带上 conversationId
const sent = [];
function sendMsg(ws, content, conversationId) {
  const clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const payload = { type: 'message', content, clientId };
  if (conversationId) payload.conversationId = conversationId;
  ws.send(JSON.stringify(payload));
  sent.push({ content, clientId });
  return clientId;
}

console.log('交替发送: 访客V1 → 客服A1 → 访客V2 → 客服A2');
sendMsg(vWs, 'V1');
await sleep(200);
sendMsg(aWs, 'A1', cid); // ⚠️ 关键：带 conversationId
await sleep(200);
sendMsg(vWs, 'V2');
await sleep(200);
sendMsg(aWs, 'A2', cid);
await sleep(600);

// 3) 幂等测试：用同一 clientId 再发一次 A1
console.log('幂等测试: 用同一 clientId 重发 A1');
const dupClientId = sent[1].clientId;
aWs.send(JSON.stringify({ type: 'message', content: 'A1', clientId: dupClientId, conversationId: cid }));
await sleep(600);

// 4) REST 拉历史
const hist = await rest(`/api/chat/conversations/${cid}?guest=${encodeURIComponent(guest)}`);
console.log('\n=== REST 历史返回（服务端按 seq 排序）===');
hist.messages.forEach((m, i) =>
  console.log(`  #${i} ${m.sender.padEnd(7)} "${m.content}"  seq=${m.seq}  createdAt=${m.createdAt}`)
);

// 5) 前端排序模拟（按 seq）
const sorted = [...hist.messages].sort((a, b) => {
  const sa = a.seq ?? null, sb = b.seq ?? null;
  if (sa != null && sb != null && sa !== sb) return sa - sb;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
});
console.log('\n=== 前端排序结果 ===');
console.log('  ' + sorted.map((m) => `${m.sender}:${m.content}`).join(' → '));

// 6) 时区一致性检查：REST 返回的 createdAt 与数据库原始值比对
// 注意：node-pg 读 timestamptz 时按本地时区(UTC+8)转 Date，Prisma 按 UTC 转，
// 直接比 toISOString 会差 8 小时但表示同一绝对时刻 → 必须比绝对时刻(epoch)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const raw = await pool.query(
  'SELECT "content", "createdAt" FROM "ChatMessage" WHERE "conversationId" = $1 ORDER BY "seq"',
  [cid]
);
console.log('\n=== 时区一致性检查（绝对时刻）===');
let tzOk = true;
hist.messages.forEach((m, i) => {
  const dbVal = new Date(raw.rows[i].createdAt).getTime();
  const restVal = new Date(m.createdAt).getTime();
  const same = dbVal === restVal;
  if (!same) tzOk = false;
  console.log(`  ${same ? '✅' : '❌'} REST=${new Date(restVal).toISOString()}  DB=${new Date(dbVal).toISOString()}`);
});
console.log('  时区一致:', tzOk ? '✅ 通过' : '❌ 不一致');

// 6b) WS 推送的 createdAt vs REST 返回的 createdAt（前端排序错乱的直接来源）
console.log('\n=== WS 推送 vs REST 返回（同一绝对时刻）===');
let wsRestOk = true;
for (const m of hist.messages) {
  const wsVal = wsTimes.get(m.content);
  if (!wsVal) {
    console.log(`  ⚠️ "${m.content}" 未收到 WS 推送`);
    continue;
  }
  const same = new Date(wsVal).getTime() === new Date(m.createdAt).getTime();
  if (!same) wsRestOk = false;
  console.log(`  ${same ? '✅' : '❌'} "${m.content}" WS=${wsVal}  REST=${m.createdAt}`);
}
console.log('  WS/REST 一致:', wsRestOk ? '✅ 通过' : '❌ 不一致');

// 7) 断言
const order = sorted.map((m) => m.content).join(',');
const expect = 'V1,A1,V2,A2';
const orderOk = order === expect;
const allLanded = hist.messages.length === 4;
const noDup = hist.messages.filter((m) => m.content === 'A1').length === 1;

console.log('\n=== 断言 ===');
console.log(`  ${orderOk ? '✅' : '❌'} 顺序交错正确: ${order} (期望 ${expect})`);
console.log(`  ${allLanded ? '✅' : '❌'} 四条全部落库: ${hist.messages.length}/4`);
console.log(`  ${noDup ? '✅' : '❌'} 幂等无重复: A1 出现 ${hist.messages.filter((m) => m.content === 'A1').length} 次`);
console.log(`  ${tzOk ? '✅' : '❌'} WS/REST 时区一致`);
console.log(`  ${wsRestOk ? '✅' : '❌'} WS 推送与 REST 返回同一绝对时刻`);

// 清理
await pool.query('DELETE FROM "ChatMessage" WHERE "conversationId" = $1', [cid]);
await pool.query('DELETE FROM "ChatConversation" WHERE "id" = $1', [cid]);
await pool.end();
vWs.close(); aWs.close();
console.log('\n(测试数据已清理)');
process.exit(orderOk && allLanded && noDup && tzOk && wsRestOk ? 0 : 1);
