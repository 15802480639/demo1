// REST 接口 E2E（游客流，无需登录）
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

console.log('1) 游客建会话');
const created = await j('POST', '/api/chat/conversations', {
  visitorName: '测试访客',
  contactType: 'email',
  contact: 'test@example.com',
  locale: 'ko',
});
console.log('  status:', created.status, '| id:', created.data.id?.slice(0, 8), '| guest:', created.data.guestToken?.slice(0, 8));
if (created.status !== 200 || !created.data.id) { console.log('  ❌ 建会话失败'); process.exit(1); }
const { id, guestToken } = created.data;

console.log('2) 拉历史（应空）');
let hist = await j('GET', `/api/chat/conversations/${id}?guest=${guestToken}`);
console.log('  status:', hist.status, '| messages:', hist.data.messages?.length);

console.log('3) 游客发消息');
const sent = await j('POST', '/api/chat/messages', { conversationId: id, content: '你好，我要咨询订单', guest: guestToken });
console.log('  status:', sent.status, '| content:', sent.data.message?.content);
if (sent.status !== 200) { console.log('  ❌ 发送失败'); process.exit(1); }

console.log('4) 拉历史（应 1 条）');
hist = await j('GET', `/api/chat/conversations/${id}?guest=${guestToken}`);
console.log('  messages:', hist.data.messages?.length, '| last:', hist.data.messages?.[0]?.content);

console.log('5) 管理员列表（未登录应 403）');
const list = await j('GET', '/api/chat/conversations');
console.log('  status:', list.status, '(期望 403)');

console.log('6) 游客发消息无 guest 应 403');
const noGuest = await j('POST', '/api/chat/messages', { conversationId: id, content: 'x' });
console.log('  status:', noGuest.status, '(期望 403)');

console.log('7) 游客标已读');
const read = await j('PATCH', `/api/chat/conversations/${id}?guest=${guestToken}`, { read: true });
console.log('  status:', read.status);

console.log('8) 清理测试数据');
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`DELETE FROM "ChatMessage" WHERE "conversationId"=$1`, [id]);
await pool.query(`DELETE FROM "ChatConversation" WHERE "id"=$1`, [id]);
await pool.end();
console.log('  done. 全部断言通过 ✅');
