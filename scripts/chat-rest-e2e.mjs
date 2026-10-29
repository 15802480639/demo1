// REST 接口 E2E（游客流，无需登录）
import 'dotenv/config'; // ⚠️ 必须先加载：末尾清理测试数据要用 DATABASE_URL
import { loginTestCustomer } from './chat-test-user.mjs';
const BASE = 'http://127.0.0.1:3000';

async function j(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// ⚠️ 访客必须已登录才能建会话（2026-10-29 起）
const cust = await loginTestCustomer('im');
const custHeader = { Cookie: `ws_session=${cust.cookie}` };

console.log('1) 访客登录后建会话');
const created = await j('POST', '/api/chat/conversations', {
  contactType: 'email',
  contact: 'test@example.com',
  locale: 'ko',
}, custHeader);
console.log('  status:', created.status, '| id:', created.data.id?.slice(0, 8), '| guest:', created.data.guestToken?.slice(0, 8));
if (created.status !== 200 || !created.data.id) { console.log('  ❌ 建会话失败'); process.exit(1); }
const { id, guestToken } = created.data;

console.log('2) 拉历史（应空）');
let hist = await j('GET', `/api/chat/conversations/${id}?guest=${guestToken}`, null, custHeader);
console.log('  status:', hist.status, '| messages:', hist.data.messages?.length);

console.log('3) 游客发消息');
const sent = await j('POST', '/api/chat/messages', { conversationId: id, content: '你好，我要咨询订单', guest: guestToken }, custHeader);
console.log('  status:', sent.status, '| content:', sent.data.message?.content);
if (sent.status !== 200) { console.log('  ❌ 发送失败'); process.exit(1); }

console.log('4) 拉历史（应 1 条）');
hist = await j('GET', `/api/chat/conversations/${id}?guest=${guestToken}`, null, custHeader);
console.log('  messages:', hist.data.messages?.length, '| last:', hist.data.messages?.[0]?.content);

console.log('5) 管理员列表（未登录应 403）');
const list = await j('GET', '/api/chat/conversations');
console.log('  status:', list.status, '(期望 403)');

console.log('6) 会话归属用户发消息（凭 cookie 即可，无需 guest）');
const noGuest = await j('POST', '/api/chat/messages', { conversationId: id, content: 'x' }, custHeader);
console.log('  status:', noGuest.status, '(期望 200：归属用户凭登录态即可)');
if (noGuest.status !== 200) { console.log('  ❌ 归属用户发消息失败'); process.exitCode = 1; }

console.log('6b) 未登录发消息应 403');
const anonMsg = await j('POST', '/api/chat/messages', { conversationId: id, content: 'x', guest: guestToken });
console.log('  status:', anonMsg.status, '(期望 403)');
if (anonMsg.status !== 403) { console.log('  ❌ 未登录发消息未被拒'); process.exitCode = 1; }

console.log('7) 游客标已读');
const read = await j('PATCH', `/api/chat/conversations/${id}?guest=${guestToken}`, { read: true }, custHeader);
console.log('  status:', read.status);

console.log('8) 清理测试数据');
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId"=$1`, [id]);
await pool.query(`DELETE FROM "ChatConversation" WHERE "id"=$1`, [id]);
await pool.end();
console.log('  done. 全部断言通过 ✅');
