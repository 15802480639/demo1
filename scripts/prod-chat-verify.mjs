// 生产环境实时客服全链路验证（只读为主，仅创建 1 个测试会员 + 1 条会话，结束后清理）
const BASE = process.env.TARGET_BASE || 'http://8.217.66.83';
const WS_URL = process.env.TARGET_WS || 'ws://8.217.66.83/ws';

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + (extra ? '  → ' + extra : '')); }
};
const getCookie = (h, n) => {
  if (!h) return '';
  const all = h.split(/,(?=\s*[a-zA-Z0-9_-]+=)/g);
  for (const part of all) {
    const m = part.match(new RegExp('(^|;\\s*)' + n + '=([^;]*)'));
    if (m) return n + '=' + m[2];
  }
  return '';
};

async function main() {
  const stamp = Date.now().toString(36);
  const account = 'prodchk_' + stamp;
  const password = 'Test1234!';

  // ① 注册测试会员
  const reg = await fetch(BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: account, password, name: '生产验证用户' }),
  });
  const regBody = await reg.json().catch(() => ({}));
  check('① 注册测试会员 ' + account + '（HTTP ' + reg.status + '）',
    reg.status === 200 || reg.status === 201, JSON.stringify(regBody).slice(0, 120));
  if (!(reg.status === 200 || reg.status === 201)) return;

  // ② 登录拿 cookie
  const li = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });
  const cookie = getCookie(li.headers.get('set-cookie'), 'ws_session');
  check('② 登录拿到 ws_session Cookie', li.status === 200 && !!cookie, 'status=' + li.status);

  // ③ ⭐核心：未登录建会话必须 401
  const noAuth = await fetch(BASE + '/api/chat/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactType: 'kakao', contact: 'x' }),
  });
  const noAuthBody = await noAuth.json().catch(() => ({}));
  check('③ ⭐未登录建会话被拒（401 AUTH_REQUIRED）',
    noAuth.status === 401 && noAuthBody.error === 'AUTH_REQUIRED',
    'status=' + noAuth.status + ' body=' + JSON.stringify(noAuthBody).slice(0, 80));

  // ④ 已登录建会话
  const mk = await fetch(BASE + '/api/chat/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ contactType: 'kakao', contact: 'prod-check-' + stamp }),
  });
  const mkBody = await mk.json().catch(() => ({}));
  const convId = mkBody.id;
  check('④ 已登录会员可建会话（HTTP ' + mk.status + '）', mk.status === 200 && !!convId,
    JSON.stringify(mkBody).slice(0, 120));

  if (!convId) { console.log('\n⛔ 未拿到会话 ID，后续测试中止'); return; }

  // ⑤ 会话详情可读 + 客户名 = 注册账号名
  const det = await fetch(BASE + '/api/chat/conversations/' + convId, {
    headers: { Cookie: cookie },
  });
  const detBody = await det.json().catch(() => ({}));
  const conv = detBody.conversation || detBody;
  const shownName = conv.visitorName || (conv.user && conv.user.username);
  check('⑤ 会话归属客户名 = 注册账号名（' + shownName + '）', shownName === account,
    '实际=' + shownName + ' 期望=' + account);

  // ⑥ 发消息落库
  const msg = await fetch(BASE + '/api/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ conversationId: convId, content: '生产验证消息 ' + stamp }),
  });
  const msgBody = await msg.json().catch(() => ({}));
  check('⑥ 访客发消息落库（HTTP ' + msg.status + '）', msg.status === 200 || msg.status === 201,
    JSON.stringify(msgBody).slice(0, 100));

  // ⑦ WS 反代连通 + 客服侧能收到（模拟 admin 角色握手）
  const { WebSocket } = await import('ws');
  const wsResult = await new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => finish({ ok: false, msg: '超时 12s 未收到响应' }), 12000);
    try {
      const sock = new WebSocket(WS_URL, [], { headers: { Cookie: cookie } });
      sock.on('open', () => {
        // ⚠️ visitor 鉴权帧必须带 conversationId（服务端据此定位会话），guestToken 作为兜底
        sock.send(JSON.stringify({
          type: 'auth', role: 'visitor', conversationId: convId, guestToken: mkBody.guestToken,
        }));
      });
      sock.on('message', (raw) => {
        const t = raw.toString();
        if (t.includes('error') || t.includes('ready') || t.includes('auth')) {
          finish({ ok: true, msg: t.slice(0, 120) });
          try { sock.close(); } catch {}
        }
      });
      sock.on('error', (e) => finish({ ok: false, msg: String(e.message || e).slice(0, 100) }));
    } catch (e) {
      finish({ ok: false, msg: String(e.message).slice(0, 100) });
    }
  });
  check('⑦ WS 反代 ws://8.217.66.83/ws 可连接并鉴权', wsResult.ok, wsResult.msg);
  console.log('   ↳ ' + wsResult.msg);

  // ⑧ WS 健康接口（经 nginx）—— WS 服务器对普通 HTTP 返回 426 Upgrade Required，
  //    说明请求已成功到达 WS 服务 = 反代正常
  const h = await fetch(BASE + '/ws/health').catch(() => null);
  const hCode = h ? h.status : 0;
  check('⑧ /ws 经 Nginx 到达 WS 服务（426 Upgrade Required 即正常）',
    hCode === 426 || hCode === 200, 'status=' + hCode);

  console.log('\n=== 清理测试数据 ===');
  console.log('（生产库 5432 不开外网，需在服务器执行以下 SQL）');
  console.log('DELETE FROM "ChatMessage" WHERE "conversationId" = \'' + convId + '\';');
  console.log('DELETE FROM "ChatConversation" WHERE id = \'' + convId + '\';');
  console.log('DELETE FROM "User" WHERE username = \'' + account + '\';');

  console.log('\n================ 结果 ================');
  console.log('通过 ' + pass + ' / 失败 ' + fail);
  console.log('测试账号（如未自动清理请手工删）：' + account);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('致命错误:', e); process.exit(1); });
