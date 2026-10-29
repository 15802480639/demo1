// 站内实时客服 —— 独立 WebSocket 服务（与 Next standalone 解耦，单独进程运行）
//
// 设计要点（对齐 webshopp 既定方案）：
//  - 监听 :4000；生产由 Nginx 将 /ws 反代到本服务，升级为 wss://。
//  - 鉴权：admin 凭 Next 的 ws_session（HMAC-SHA256 无状态 token）校验；
//          agent（H5 客服）凭 cs_session 校验；
//          visitor 凭 conversationId + guestToken（存浏览器 localStorage）校验。
//  - 消息落库用原生 pg（不依赖 Prisma 构建），与 Next 端共用同一 PostgreSQL。
//  - 实时广播：新消息推给所有客服连接 + 该会话的 visitor 连接；
//    已读标记、输入态也实时同步，驱动后台红点 / 响铃 / 桌面通知。
//  - 列名与 Prisma 迁移保持一致（驼峰、双引号），例如 "guestToken" / "conversationId"。
//  - 未读数按客服各算各的（ChatReadCursor 游标），A 看了不影响 B 的红点。
import 'dotenv/config';
import http from 'http';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import pg from 'pg';

const { Pool } = pg;

const PORT = Number(process.env.CHAT_WS_PORT || 4000);
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const DATABASE_URL = process.env.DATABASE_URL;
// Next 端的会话 cookie 名（必须与 src/lib/auth.ts 的 SESSION_COOKIE 一致）
const SESSION_COOKIE = 'ws_session';
// H5 客服会话 cookie 名（必须与 src/lib/cs-auth.ts 的 CS_SESSION_COOKIE 一致）
const CS_SESSION_COOKIE = 'cs_session';
// H5 客服令牌作用域标记（与 src/lib/cs-auth.ts 的 CS_TOKEN_SCOPE 一致）
const CS_TOKEN_SCOPE = 'cs-agent';
// LISTEN/NOTIFY 频道：Next 进程（REST 兜底落库）用它通知本进程广播
const NOTIFY_CHANNEL = 'chat_broadcast';

if (!DATABASE_URL) {
  console.error('[chat-ws] 缺少 DATABASE_URL，无法启动');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ---------- 鉴权：复用 Next auth.ts / cs-auth.ts 的 HMAC-SHA256 无状态 token 校验 ----------
/** 定长比较，避免时序侧信道 */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * 解析并验签一个 token 的 payload（不做角色判断）。
 * 三种 token 共用同一个 AUTH_SECRET，靠 payload 内的字段区分：
 *   ws_session cookie  → { id, role:'admin', ... }（无 scope，无 exp）
 *   chat-ws 短时令牌   → { id, role, scope:'chat-ws', exp }
 *   cs_session cookie  → { id, username, scope:'cs-agent' }
 */
function parseToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (!safeEqual(expected, sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.id) return null;
    // 短时令牌带 exp；cookie 会话令牌没有 exp
    if (data.exp && Date.now() > Number(data.exp)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 校验后台管理员会话令牌。兼容两种来源：
 *  1) Cookie 里的 ws_session（握手时由浏览器自动带上，HttpOnly 也无所谓）
 *     → payload 无 scope 字段，只有 role === 'admin'
 *  2) /api/chat/ws-token 换来的短时令牌（Cookie 没被代理转发时的兜底）
 *     → payload scope === 'chat-ws' 且 role === 'admin'
 */
function verifyAdminToken(token) {
  const data = parseToken(token);
  if (!data || data.role !== 'admin') return null;
  return data; // { id, role, ... }
}

/**
 * 校验短时 WS 令牌（/api/chat/ws-token 签发）。
 * scope 恒为 'chat-ws'，role 为 admin（后台）或 agent（H5 客服）。
 */
function verifyStaffWsToken(token) {
  const data = parseToken(token);
  if (!data) return null;
  if (data.scope !== 'chat-ws') return null;
  if (data.role !== 'admin' && data.role !== 'agent') return null;
  return data;
}

/**
 * 校验 H5 客服会话令牌（cs_session Cookie）。
 * 与 ws_session 用同一个 AUTH_SECRET，但 payload 带 scope='cs-agent'，
 * 靠 scope 隔离两套体系，防止后台令牌被当成客服令牌使用（跨体系令牌重放）。
 */
function verifyCsToken(token) {
  const data = parseToken(token);
  if (!data) return null;
  if (!data.username) return null;
  if (data.scope !== CS_TOKEN_SCOPE) return null;
  return data; // { id, username, displayName, scope }
}

/**
 * 校验商城会员会话令牌（ws_session Cookie 里 role==='customer' 的那部分）。
 *
 * ⭐ 用途：实时客服要求访客必须已注册登录（子建 2026-10-29）。
 *    访客连 WS 时浏览器会自动带上 ws_session Cookie（Cookie 不区分端口，
 *    生产环境同域 /ws 反代也一样带），据此确认「我是登录用户」。
 *    注意 role==='admin' 的令牌不算 —— 那是后台管理员，身份不同。
 */
function verifyCustomerToken(token) {
  const data = parseToken(token);
  if (!data) return null;
  if (data.role !== 'customer') return null;
  return data; // { id, username, name, email, role }
}

/** 解析请求头 Cookie: "a=1; ws_session=xxx" */
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (!k) continue;
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

// ---------- 连接状态 ----------
// adminSockets：所有已鉴权的客服连接（后台管理员 + H5 客服）
//   每条连接带 staffId，用于按客服分别计算未读数
const adminSockets = new Set();
const visitorSockets = new Map(); // conversationId -> Set<ws>

function addVisitor(conversationId, ws) {
  if (!visitorSockets.has(conversationId)) visitorSockets.set(conversationId, new Set());
  visitorSockets.get(conversationId).add(ws);
}
function removeVisitor(conversationId, ws) {
  const set = visitorSockets.get(conversationId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) visitorSockets.delete(conversationId);
  }
}

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      /* 忽略单条发送失败 */
    }
  }
}
function broadcastToAdmins(obj) {
  for (const ws of adminSockets) send(ws, obj);
}
function broadcastToVisitors(conversationId, obj) {
  const set = visitorSockets.get(conversationId);
  if (!set) return;
  for (const ws of set) send(ws, obj);
}

// ---------- DB 操作 ----------
// ⚠️ 时间戳统一走 to_char(... AT TIME ZONE 'UTC') 生成 UTC ISO 字符串：
//    Prisma adapter 读 timestamptz 会按会话时区壁钟解读（实测多 9 小时），
//    若 WS 侧用驱动解析、REST 侧用 Prisma 解析，两边会差一个时区 → 前端排序错乱。
//    两边都用字面 UTC 字符串即可保证绝对时刻一致。
const ISO_UTC_SQL = (col) =>
  `to_char(${col} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

async function getConversation(id) {
  const r = await pool.query(
    `SELECT "id", "guestToken", "status", "userId" FROM "ChatConversation" WHERE "id" = $1`,
    [id]
  );
  return r.rows[0] || null;
}

/**
 * 校验访客是否有权连接某个会话。
 *
 * ⭐ 规则（子建 2026-10-29）：使用实时客服必须先在商城注册并登录。
 *   ① 会话已绑定 userId → 必须凭登录态证明「我就是归属用户」
 *      （ws_session cookie 里带 User.id，或访客短时令牌）
 *   ② 历史游客会话（userId 为 null）→ 回落 guestToken 校验
 */
async function verifyVisitorAccess(conv, guestToken, sessionUser) {
  if (!conv) return false;
  if (conv.userId) {
    // 已登录用户会话：必须是归属用户本人
    return !!sessionUser && sessionUser.id === conv.userId;
  }
  // 历史游客会话：guestToken 匹配即可（仅限这一个会话）
  return !!conv.guestToken && !!guestToken && conv.guestToken === guestToken;
}

/**
 * 查客服账号是否在职。
 * ⚠️ 必须查库：后台把账号停用后，已建立的 WS 连接不能继续有权限，
 *    新连接也不能只凭 Cookie 里的令牌就通过（令牌 7 天才过期）。
 */
async function isAgentActive(agentId) {
  const r = await pool.query(`SELECT "active" FROM "ChatAgent" WHERE "id" = $1`, [agentId]);
  return !!(r.rows[0] && r.rows[0].active);
}

async function insertMessage(
  conversationId,
  sender,
  content,
  imageUrl,
  clientId,
  sentByStaffId,
  productSlug
) {
  // 幂等：同一 conversationId + clientId 只落一条（WS 与 REST 双通道可能重复提交）
  const r = await pool.query(
    `INSERT INTO "ChatMessage" ("id", "conversationId", "sender", "content", "imageUrl", "clientId", "sentByStaffId", "productSlug", "read", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, now())
     ON CONFLICT ("conversationId", "clientId") DO NOTHING
     RETURNING "id", "sender", "content", "imageUrl", "productSlug", "read", "clientId", "seq",
               ${ISO_UTC_SQL('"createdAt"')} AS "createdAtIso"`,
    [
      crypto.randomUUID(),
      conversationId,
      sender,
      content ?? null,
      imageUrl ?? null,
      clientId ?? crypto.randomUUID(),
      sentByStaffId ?? null,
      productSlug ?? null,
    ]
  );

  let row = r.rows[0];
  if (!row) {
    // 冲突（重复提交）→ 取回已存在的那条
    const dup = await pool.query(
      `SELECT "id", "sender", "content", "imageUrl", "productSlug", "read", "clientId", "seq",
              ${ISO_UTC_SQL('"createdAt"')} AS "createdAtIso"
       FROM "ChatMessage" WHERE "conversationId" = $1 AND "clientId" = $2`,
      [conversationId, clientId]
    );
    row = dup.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      conversationId,
      sender: row.sender,
      content: row.content,
      imageUrl: row.imageUrl,
      productSlug: row.productSlug,
      read: row.read,
      createdAt: row.createdAtIso,
      seq: row.seq,
      clientId: row.clientId,
      duplicate: true,
    };
  }

  await pool.query(
    `UPDATE "ChatConversation" SET "lastMessageAt" = now(), "updatedAt" = now() WHERE "id" = $1`,
    [conversationId]
  );
  return {
    id: row.id,
    conversationId,
    sender: row.sender,
    content: row.content,
    imageUrl: row.imageUrl,
    productSlug: row.productSlug,
    read: row.read,
    createdAt: row.createdAtIso,
    seq: row.seq,
    clientId: row.clientId,
    duplicate: false,
  };
}

/**
 * ⭐ 按客服身份计算某会话的未读数。
 * 未读 = 该会话中 seq 大于"此客服已读游标"的访客消息条数。
 * 每个客服有自己的游标 → A 看了不影响 B 的红点。
 * staffId 形如 admin:<User.id> / agent:<ChatAgent.id>
 */
async function countUnreadForStaff(conversationId, staffId) {
  if (!staffId) return 0;
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM "ChatMessage" m
       LEFT JOIN "ChatReadCursor" c
              ON c."conversationId" = m."conversationId" AND c."staffId" = $2
      WHERE m."conversationId" = $1
        AND m."sender" = 'visitor'
        AND m."seq" > COALESCE(c."lastReadSeq", 0)`,
    [conversationId, staffId]
  );
  return r.rows[0]?.n || 0;
}

/**
 * 推进某客服在该会话的已读游标到当前最大 seq。
 * GREATEST 保证只进不退（多端并发不会把游标拉回去）。
 */
async function advanceCursor(conversationId, staffId) {
  if (!staffId) return;
  await pool.query(
    `INSERT INTO "ChatReadCursor" ("id", "conversationId", "staffId", "lastReadSeq", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2,
             COALESCE((SELECT MAX("seq") FROM "ChatMessage" WHERE "conversationId" = $1), 0),
             now(), now())
     ON CONFLICT ("conversationId", "staffId")
     DO UPDATE SET "lastReadSeq" = GREATEST("ChatReadCursor"."lastReadSeq", EXCLUDED."lastReadSeq"),
                   "updatedAt" = now()`,
    [conversationId, staffId]
  );
}

async function markRead(conversationId, senderSide) {
  await pool.query(
    `UPDATE "ChatMessage" SET "read" = true WHERE "conversationId" = $1 AND "sender" = $2 AND "read" = false`,
    [conversationId, senderSide]
  );
}

// ---------- HTTP（健康检查 + 内部广播）+ WS ----------
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        admins: adminSockets.size,
        visitors: visitorSockets.size,
        conversations: visitorSockets.size,
      })
    );
    return;
  }

  // 内部广播：Next 端 REST 兜底落库后调用，让本进程把消息实时推给客服/访客。
  // 仅本机可访问（生产由 Nginx 只反代 /ws，不暴露此路径），且需携带内部密钥。
  if (req.url === '/internal/broadcast' && req.method === 'POST') {
    const secret = req.headers['x-internal-secret'];
    if (!secret || !safeEqual(String(secret), AUTH_SECRET)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'FORBIDDEN' }));
      return;
    }
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 256 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        const conversationId = String(body.conversationId || '');
        const message = body.message || null;
        if (!conversationId || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'BAD_REQUEST' }));
          return;
        }
        broadcastMessage(conversationId, message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'BAD_JSON' }));
      }
    });
    return;
  }

  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('Upgrade Required');
});

/**
 * 把一条已落库的消息广播给所有客服 + 该会话访客。
 * ⭐ convUpdate 的未读数按客服各算各的 → 必须逐连接发送，不能群发同一个数字。
 */
async function broadcastMessage(conversationId, message) {
  const envelope = { type: 'message', conversationId, message };
  broadcastToAdmins(envelope);
  broadcastToVisitors(conversationId, envelope);
  try {
    await broadcastConvUpdate(conversationId, {
      lastMessageAt: message.createdAt,
      lastSender: message.sender,
      lastPreview:
        message.content || (message.imageUrl ? '[image]' : message.productSlug ? '[商品]' : ''),
    });
  } catch {
    /* 统计失败不影响消息推送 */
  }
}

/**
 * 推送会话列表更新事件。未读数按每个客服自己的游标算 → 逐连接发送。
 */
async function broadcastConvUpdate(conversationId, extra) {
  // 收集当前在线客服的 staffId（去重），一次查库拿到各自的未读数
  const staffIds = new Set();
  for (const ws of adminSockets) {
    if (ws.meta?.staffId) staffIds.add(ws.meta.staffId);
  }

  const unreadMap = new Map();
  if (staffIds.size) {
    const list = [...staffIds];
    const r = await pool.query(
      `SELECT s."staffId",
              COUNT(m."id")::int AS n
         FROM unnest($2::text[]) AS s("staffId")
         LEFT JOIN "ChatReadCursor" c
                ON c."conversationId" = $1 AND c."staffId" = s."staffId"
         LEFT JOIN "ChatMessage" m
                ON m."conversationId" = $1
               AND m."sender" = 'visitor'
               AND m."seq" > COALESCE(c."lastReadSeq", 0)
        GROUP BY s."staffId"`,
      [conversationId, list]
    );
    for (const row of r.rows) unreadMap.set(row.staffId, row.n);
  }

  for (const ws of adminSockets) {
    const staffId = ws.meta?.staffId;
    send(ws, {
      type: 'convUpdate',
      conversationId,
      unreadAdmin: unreadMap.get(staffId) || 0,
      ...extra,
    });
  }
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.meta = {
    authed: false,
    role: null,
    conversationId: null,
    guestToken: null,
    userId: null,
    // 客服身份键：admin:<User.id> 或 agent:<ChatAgent.id>（未读游标分区键）
    staffId: null,
    // 握手阶段从 Cookie 解析出的后台身份（尚未决定角色）
    cookieAdminUser: null,
    // 握手阶段从 Cookie 解析出的 H5 客服身份
    cookieAgentUser: null,
    // 握手阶段从 Cookie 解析出的商城会员身份（访客侧「必须登录」校验用）
    cookieCustomerUser: null,
  };
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // ⭐ 握手阶段解析 Cookie 并预先验签。
  //    之前后台连不上就是因为 ws_session 是 HttpOnly，前端 JS 读不到，
  //    只能靠升级请求自动带上的 Cookie 来认身份（Cookie 不区分端口，天然可用）。
  //    注意：这里只"备好"身份，不直接认定角色 ——
  //    否则登录了 admin 的浏览器打开前台时，访客连接会被误当成客服连接。
  //    两个 Cookie 各自独立解析：ws_session → 后台管理员，cs_session → H5 客服。
  try {
    const cookies = parseCookies(req?.headers?.cookie);
    const adminToken = cookies[SESSION_COOKIE];
    if (adminToken) {
      const user = verifyAdminToken(adminToken);
      if (user) ws.meta.cookieAdminUser = user;
    }
    const csToken = cookies[CS_SESSION_COOKIE];
    if (csToken) {
      const agent = verifyCsToken(csToken);
      if (agent) ws.meta.cookieAgentUser = agent;
    }
    // 商城会员身份（role=customer）→ 访客连 WS 时的「必须登录」依据
    const custToken = cookies[SESSION_COOKIE];
    if (custToken) {
      const customer = verifyCustomerToken(custToken);
      if (customer) ws.meta.cookieCustomerUser = customer;
    }
  } catch {
    /* 忽略 cookie 解析异常，走后续 auth 消息鉴权 */
  }

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'BAD_JSON' });
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    // 鉴权（首条必须是 auth）
    if (msg.type === 'auth') {
      if (ws.meta.authed) {
        send(ws, { type: 'error', message: 'ALREADY_AUTHED' });
        return;
      }
      if (msg.role === 'admin') {
        // ⚠️ token 优先取 auth 消息里的（前端拿不到 HttpOnly cookie 时会是空串），
        //    空串则回退到握手阶段从 Cookie 解析出的身份。
        const user = verifyAdminToken(msg.token) || ws.meta.cookieAdminUser || null;
        if (!user || user.role !== 'admin') {
          send(ws, { type: 'error', message: 'FORBIDDEN' });
          ws.close();
          return;
        }
        ws.meta = {
          ...ws.meta,
          authed: true,
          role: 'admin',
          userId: user.id,
          staffId: `admin:${user.id}`,
        };
        adminSockets.add(ws);
        send(ws, { type: 'authed', role: 'admin' });
        return;
      }
      if (msg.role === 'agent') {
        // H5 客服：短时令牌（/api/chat/ws-token 签发，role=agent）或握手阶段的 cs_session
        // ⚠️ 只认 role === 'agent' 的令牌 —— 后台管理员的令牌（role=admin）不能当客服用，
        //    否则会出现 staffId 指向不存在的客服账号。
        const tokenUser = verifyStaffWsToken(msg.token);
        const user =
          (tokenUser && tokenUser.role === 'agent' ? tokenUser : null) ||
          ws.meta.cookieAgentUser ||
          null;
        if (!user) {
          send(ws, { type: 'error', message: 'FORBIDDEN' });
          ws.close();
          return;
        }
        const agentId = user.id;
        // 查库确认账号仍在职（停用即刻断开，不靠令牌过期）
        if (!(await isAgentActive(agentId))) {
          send(ws, { type: 'error', message: 'FORBIDDEN' });
          ws.close();
          return;
        }
        ws.meta = {
          ...ws.meta,
          authed: true,
          role: 'agent',
          userId: agentId,
          staffId: `agent:${agentId}`,
        };
        adminSockets.add(ws);
        send(ws, { type: 'authed', role: 'agent' });
        return;
      }
      if (msg.role === 'visitor') {
        const conv = await getConversation(msg.conversationId);
        // ⭐ 访客必须已登录（会话已绑定 userId 时），或持历史游客会话的 guestToken
        const sessionUser = ws.meta.cookieCustomerUser || null;
        if (!(await verifyVisitorAccess(conv, msg.guestToken, sessionUser))) {
          send(ws, { type: 'error', message: 'BAD_CONVERSATION' });
          ws.close();
          return;
        }
        ws.meta = {
          ...ws.meta,
          authed: true,
          role: 'visitor',
          conversationId: conv.id,
          guestToken: conv.guestToken,
        };
        addVisitor(conv.id, ws);
        send(ws, { type: 'authed', role: 'visitor', conversationId: conv.id });
        return;
      }
      send(ws, { type: 'error', message: 'UNKNOWN_ROLE' });
      ws.close();
      return;
    }

    // 其余消息必须先鉴权
    if (!ws.meta.authed) {
      send(ws, { type: 'error', message: 'UNAUTHENTICATED' });
      return;
    }

    try {
      if (msg.type === 'message') {
        // 确定会话：visitor 从连接元数据取；客服（admin/agent）必须由客户端显式带 conversationId
        let conversationId = null;
        if (ws.meta.role === 'visitor') {
          conversationId = ws.meta.conversationId;
        } else if (ws.meta.role === 'admin' || ws.meta.role === 'agent') {
          conversationId = typeof msg.conversationId === 'string' ? msg.conversationId : null;
        }
        if (!conversationId) {
          send(ws, { type: 'error', message: 'NO_CONVERSATION' });
          return;
        }
        const conv = await getConversation(conversationId);
        if (!conv) {
          send(ws, { type: 'error', message: 'CONVERSATION_NOT_FOUND' });
          return;
        }
        // 客服（admin 与 agent）统一以 sender='admin' 落库：
        // 访客侧靠这个值判断"客服已读"，内部归属另存 sentByStaffId。
        const sender = ws.meta.role === 'visitor' ? 'visitor' : 'admin';
        const sentByStaffId = ws.meta.role === 'visitor' ? null : ws.meta.staffId;
        const content = typeof msg.content === 'string' ? msg.content.slice(0, 4000) : null;
        const imageUrl = typeof msg.imageUrl === 'string' ? msg.imageUrl.slice(0, 2000) : null;
        // 附带的商品引用（访客把商品发给客服）：只保留合法 slug 字符
        const productSlug =
          typeof msg.productSlug === 'string'
            ? msg.productSlug
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 81) || null
            : null;
        if (!content && !imageUrl && !productSlug) {
          send(ws, { type: 'error', message: 'EMPTY_MESSAGE' });
          return;
        }
        const clientId = typeof msg.clientId === 'string' && msg.clientId ? msg.clientId : null;
        const message = await insertMessage(
          conversationId,
          sender,
          content,
          imageUrl,
          clientId,
          sentByStaffId,
          productSlug
        );
        if (!message) {
          send(ws, { type: 'error', message: 'INSERT_FAILED' });
          return;
        }
        const envelope = {
          type: 'message',
          conversationId,
          message: { ...message, clientId: clientId ?? message.clientId },
        };
        // 推给所有客服 + 该会话访客（含发送者，靠 clientId 去重）
        broadcastToAdmins(envelope);
        broadcastToVisitors(conversationId, envelope);

        // 实时更新客服列表（未读红点 / 预览）—— 未读数按各客服的游标分别计算
        await broadcastConvUpdate(conversationId, {
          lastMessageAt: message.createdAt,
          lastSender: sender,
          lastPreview: content || (imageUrl ? '[image]' : productSlug ? '[商品]' : ''),
        });
        return;
      }
      if (msg.type === 'read') {
        let conversationId = ws.meta.role === 'visitor' ? ws.meta.conversationId : msg.conversationId;
        if (!conversationId) return;
        if (ws.meta.role === 'visitor') {
          // 访客读取 → 把客服发的未读标为已读
          await markRead(conversationId, 'admin');
          // ⚠️ 未读数按客服各算各的 → 不能群发一个数字，必须走 convUpdate 逐连接下发
          await broadcastConvUpdate(conversationId, {});
          broadcastToAdmins({ type: 'read', conversationId, by: 'visitor' });
          return;
        }
        // 客服读取 → 推进"自己"的已读游标（不动别人的）+ 把访客消息标记为已读
        await advanceCursor(conversationId, ws.meta.staffId);
        await markRead(conversationId, 'visitor');
        await broadcastConvUpdate(conversationId, {});
        broadcastToVisitors(conversationId, { type: 'read', conversationId, by: 'admin' });
        return;
      }

      if (msg.type === 'typing') {
        const conversationId = ws.meta.role === 'visitor' ? ws.meta.conversationId : msg.conversationId;
        if (!conversationId) return;
        const obj = {
          type: 'typing',
          conversationId,
          by: ws.meta.role,
          isTyping: !!msg.isTyping,
        };
        if (ws.meta.role === 'admin' || ws.meta.role === 'agent') {
          broadcastToVisitors(conversationId, obj);
          broadcastToAdmins(obj);
        } else {
          broadcastToAdmins(obj);
        }
        return;
      }
    } catch (e) {
      console.error('[chat-ws] 处理消息出错:', e?.message || e);
      send(ws, { type: 'error', message: 'SERVER_ERROR' });
    }
  });

  ws.on('close', () => {
    if (ws.meta.role === 'admin' || ws.meta.role === 'agent') adminSockets.delete(ws);
    if (ws.meta.role === 'visitor' && ws.meta.conversationId) {
      removeVisitor(ws.meta.conversationId, ws);
    }
  });
});

// 心跳：清理死连接
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* noop */
    }
  });
}, 30000);

server.on('close', () => clearInterval(heartbeat));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[chat-ws] 客服 WebSocket 服务已启动: ws://0.0.0.0:${PORT}`);
});
