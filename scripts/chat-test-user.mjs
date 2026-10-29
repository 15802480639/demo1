// IM 回归脚本的共享辅助：测试会员注册/登录
//
// ⚠️ 2026-10-29 起，站内实时客服要求访客必须已注册并登录（子建需求）：
//    POST /api/chat/conversations 未登录直接 401 AUTH_REQUIRED。
//    所以所有访客侧回归脚本必须先拿到一个登录会员的 ws_session。
//
// 这个模块提供一个统一的 helper，各脚本 import 即可。

export const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';

/** 从 set-cookie 头里提取指定 cookie（Node fetch 会用 ', ' 拼接多条，要小心） */
export function getCookie(setCookie, name) {
  const all = Array.isArray(setCookie)
    ? setCookie
    : String(setCookie || '').split(/,\s*(?=[^;]+=)/);
  for (const c of all) {
    const m = String(c).match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return '';
}

/**
 * 注册（必要时）并登录一个测试会员，返回 ws_session cookie。
 * @param tag  账号前缀，便于区分来源脚本、也便于事后清理
 * @returns { cookie, username, password, userId }
 */
export async function loginTestCustomer(tag = 'im') {
  const username = `${tag}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const password = 'test1234';

  // 先尝试注册（已存在会 409，忽略即可）
  await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).catch(() => {});

  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: username, password }),
  });
  const cookie = getCookie(r.headers.get('set-cookie'), 'ws_session');
  if (!cookie) {
    throw new Error(`测试会员登录失败（${username}）status=${r.status}`);
  }
  return { cookie, username, password, userId: '' };
}

/** 清理测试会员与其会话（按账号名前缀） */
export async function cleanupTestCustomers(prefixes = ['im_', 'gate_', 'kor_v_']) {
  try {
    const { Pool } = await import('pg');
    const dotenv = (await import('dotenv')).default;
    dotenv.config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const users = await pool.query(
      `SELECT id, username FROM "User" WHERE username LIKE ANY($1)`,
      [prefixes.map((p) => `${p}%`)]
    );
    for (const u of users.rows) {
      await pool.query(`DELETE FROM "ChatConversation" WHERE "userId" = $1`, [u.id]);
      await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [u.id]);
    }
    await pool.end();
    return users.rows.length;
  } catch (e) {
    console.log('⚠️ 清理测试会员失败：', String(e).slice(0, 100));
    return 0;
  }
}
