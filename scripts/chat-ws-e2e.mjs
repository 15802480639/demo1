// 临时 E2E 测试：验证 WS 服务协议（游客→客服实时广播 + admin token 校验）
import 'dotenv/config';
import crypto from 'crypto';
import pg from 'pg';
import WebSocket from 'ws';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const WS_URL = 'ws://127.0.0.1:4000';

function makeAdminToken(user) {
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, role: 'admin', name: user.name, email: user.email, username: user.username, iat: Date.now() })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

const adminUser = (await pool.query(`SELECT "id","role","name","email","username" FROM "User" WHERE "role"='admin' LIMIT 1`)).rows[0];
if (!adminUser) throw new Error('没有 admin 用户');
const adminToken = makeAdminToken(adminUser);

// 建一个测试会话
const gt = crypto.randomBytes(12).toString('hex');
const conv = (await pool.query(
  `INSERT INTO "ChatConversation" ("id","guestToken","status","locale","lastMessageAt","createdAt","updatedAt")
   VALUES ($1,$2,'open','ko',now(),now(),now()) RETURNING "id","guestToken"`,
  [crypto.randomUUID(), gt]
)).rows[0];
console.log('测试会话:', conv.id, conv.guestToken);

const events = { admin: [], visitor: [] };

const adminWs = await open(WS_URL);
adminWs.on('message', (d) => events.admin.push(JSON.parse(d.toString())));
adminWs.send(JSON.stringify({ type: 'auth', role: 'admin', token: adminToken }));
await new Promise((r) => setTimeout(r, 300));
console.log('admin authed?', events.admin.some((e) => e.type === 'authed' && e.role === 'admin'));

const visitorWs = await open(WS_URL);
visitorWs.on('message', (d) => events.visitor.push(JSON.parse(d.toString())));
visitorWs.send(JSON.stringify({ type: 'auth', role: 'visitor', conversationId: conv.id, guestToken: conv.guestToken }));
await new Promise((r) => setTimeout(r, 300));
console.log('visitor authed?', events.visitor.some((e) => e.type === 'authed' && e.role === 'visitor'));

// 游客发消息
visitorWs.send(JSON.stringify({ type: 'message', content: '你好，我要咨询订单', clientId: 'c1' }));
await new Promise((r) => setTimeout(r, 500));

const adminGot = events.admin.find((e) => e.type === 'message' && e.message.content === '你好，我要咨询订单');
console.log('客服实时收到游客消息?', !!adminGot);

// 客服回复
adminWs.send(JSON.stringify({ type: 'message', conversationId: conv.id, content: '您好，已收到', clientId: 'c2' }));
await new Promise((r) => setTimeout(r, 500));
const visitorGot = events.visitor.find((e) => e.type === 'message' && e.message.content === '您好，已收到');
console.log('游客实时收到客服回复?', !!visitorGot);

// 已读：客服读取游客消息
adminWs.send(JSON.stringify({ type: 'read', conversationId: conv.id }));
await new Promise((r) => setTimeout(r, 400));
const readEvt = events.admin.find((e) => e.type === 'read' && e.conversationId === conv.id);
console.log('已读事件(unreadAdmin)?', readEvt?.unreadAdmin);

// 校验库里落了 2 条消息
const cnt = (await pool.query(`SELECT COUNT(*)::int n FROM "ChatMessage" WHERE "conversationId"=$1`, [conv.id])).rows[0].n;
console.log('DB 消息条数:', cnt);

// 清理
await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId"=$1`, [conv.id]);
await pool.query(`DELETE FROM "ChatConversation" WHERE "id"=$1`, [conv.id]);
adminWs.close();
visitorWs.close();
await pool.end();
console.log('E2E 完成，测试数据已清理');
