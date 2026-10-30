// 生产 H5 客服工作台验证：建客服账号 → 登录 /cs → 韩文界面 + 会话可见 → 删测试账号
const BASE = process.env.TARGET_BASE || 'http://8.217.66.83';

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
  // ⚠️ 账号密码一律走环境变量，勿硬编码进仓库
  const agentName = process.env.CS_AGENT_USER || 'chkagent_' + stamp;
  const agentPass = process.env.CS_AGENT_PASS || '';
  if (!agentPass) { console.log('❌ 缺少环境变量 CS_AGENT_PASS'); process.exit(1); }

  // ① admin 登录（后台与前台共用 /api/auth/login，靠账号区分）
  const adminPass = process.env.ADMIN_PASS || '';
  if (!adminPass) { console.log('❌ 缺少环境变量 ADMIN_PASS'); process.exit(1); }
  const li = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'admin@shop.com', password: adminPass }),
  });
  const adminCookie = getCookie(li.headers.get('set-cookie'), 'ws_session');
  check('① admin 后台登录', li.status === 200 && !!adminCookie, 'status=' + li.status);
  if (!adminCookie) return;

  // ② 创建客服账号
  const mk = await fetch(BASE + '/api/admin/support-agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ username: agentName, password: agentPass, displayName: '검증상담원' }),
  });
  const mkBody = await mk.json().catch(() => ({}));
  const agentId = mkBody.agent && mkBody.agent.id;
  check('② 后台创建客服账号（HTTP ' + mk.status + '）', mk.status === 200 && !!agentId,
    JSON.stringify(mkBody).slice(0, 120));
  if (!agentId) return;

  // ③ 客服登录 /cs（拿 cs_session）
  const cs = await fetch(BASE + '/api/cs/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: agentName, password: agentPass }),
  });
  const csCookie = getCookie(cs.headers.get('set-cookie'), 'cs_session');
  check('③ 客服登录 /cs 拿到 cs_session（HTTP ' + cs.status + '）', cs.status === 200 && !!csCookie,
    'status=' + cs.status);

  // ④ 客服会话列表可读
  const list = await fetch(BASE + '/api/chat/conversations', { headers: { Cookie: csCookie } });
  const listBody = await list.json().catch(() => ({}));
  const arr = Array.isArray(listBody) ? listBody : (listBody.conversations || []);
  check('④ 客服拉取会话列表（HTTP ' + list.status + '，共 ' + arr.length + ' 条）',
    list.status === 200, JSON.stringify(listBody).slice(0, 120));

  // ⑤ 韩文界面（/cs/login 页面 SSR 文案）
  const page = await fetch(BASE + '/cs/login');
  const html = await page.text();
  const hasKo = /상담원 작업대|상담원 계정|로그인/.test(html);
  const hasZh = /客服工作台|咨询员工作台|账号或密码/.test(html);
  check('⑤ /cs/login 渲染韩文文案', page.status === 200 && hasKo && !hasZh,
    'status=' + page.status + ' ko=' + hasKo + ' zh=' + hasZh);
  check('⑥ /cs/login lang="ko"', /<html lang="ko"/.test(html), (html.match(/<html[^>]*>/) || [''])[0]);

  // ⑦ 客服台页面（已登录应返回工作台而非跳登录）
  const work = await fetch(BASE + '/cs', { headers: { Cookie: csCookie }, redirect: 'manual' });
  check('⑦ /cs 客服台可访问（HTTP ' + work.status + '）', work.status === 200, 'status=' + work.status);

  console.log('\n=== 清理测试客服账号 ===');
  // ⚠️ 只清理脚本自己建的临时账号，绝不能删正式客服账号
  if (!agentName.startsWith('chkagent_')) {
    console.log('⚠️ 账号非临时测试账号（' + agentName + '），跳过删除');
    console.log('\n================ 结果 ================');
    console.log('通过 ' + pass + ' / 失败 ' + fail);
    process.exit(fail ? 1 : 0);
  }
  const del = await fetch(BASE + '/api/admin/support-agents/' + agentId, {
    method: 'DELETE', headers: { Cookie: adminCookie },
  });
  check('⑧ 删除测试客服账号（HTTP ' + del.status + '）', del.status === 200 || del.status === 204,
    'status=' + del.status);

  console.log('\n================ 结果 ================');
  console.log('通过 ' + pass + ' / 失败 ' + fail);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('致命错误:', e); process.exit(1); });
