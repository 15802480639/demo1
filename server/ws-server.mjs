// 站内实时客服 —— 独立 WebSocket 服务（与 Next standalone 解耦，单独进程运行）
//
// 设计要点（对齐 webshopp 既定方案）：
//  - 监听 :4000；生产由 Nginx 将 /ws 反代到本服务，升级为 wss://。
//  - 鉴权：admin 凭 Next 的 ws_session（HMAC-SHA256 无状态 token）校验；
//          visitor 凭 conversationId + guestToken（存浏览器 localStorage）校验。
//  - 消息落库用原生 pg（不依赖 Prisma 构建），与 Next 端共用同一 PostgreSQL。
//  - 实时广播：新消息推给所有 admin 连接 + 该会话的 visitor 连接；
//    已读标记、输入态也实时同步，驱动后台红点 / 响铃 / 桌面通知。
//  - 列名与 Prisma 迁移保持一致（驼峰、双引号），例如 "guestToken" / "conversationId"。
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
// LISTEN/NOTIFY 频道：Next 进程（REST 兜底落库）用它通知本进程广播
const NOTIFY_CHANNEL = 'chat_broadcast';

if (!DATABASE_URL) {
  console.error('[chat-ws] 缺少 DATABASE_URL，无法启动');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ---------- 鉴权：复用 Next auth.ts 的 HMAC-SHA256 无状态 token 校验 ----------
/** 定长比较，避免时序侧信道 */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * 校验后台会话令牌。兼容两种来源：
 *  1) Cookie 里的 ws_session（握手时由浏览器自动带上，HttpOnly 也无所谓）
 *  2) /api/chat/ws-token 换来的短时令牌（Cookie 没被代理转发时的兜底）
 * 两者同为 AUTH_SECRET 签名、payload 含 id 且 role === 'admin'。
 */
function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (!safeEqual(expected, sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.id) return null;
    if (data.role !== 'admin') return null;
    // 短时令牌带 exp；cookie 会话令牌没有 exp
    if (data.exp && Date.now() > Number(data.exp)) return null;
    return data; // { id, role, ... }
  } catch {
    return null;
  }
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
const adminSockets = new Set(); // 所有已鉴权的客服连接
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

async function insertMessage(conversationId, sender, content, imageUrl, clientId) {
  // 幂等：同一 conversationId + clientId 只落一条（WS 与 REST 双通道可能重复提交）
  const r = await pool.query(
    `INSERT INTO "ChatMessage" ("id", "conversationId", "sender", "content", "imageUrl", "clientId", "read", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, false, now())
     ON CONFLICT ("conversationId", "clientId") DO NOTHING
     RETURNING "id", "sender", "content", "imageUrl", "read", "clientId", "seq",
               ${ISO_UTC_SQL('"createdAt"')} AS "createdAtIso"`,
    [crypto.randomUUID(), conversationId, sender, content ?? null, imageUrl ?? null, clientId ?? crypto.randomUUID()]
  );

  let row = r.rows[0];
  if (!row) {
    // 冲突（重复提交）→ 取回已存在的那条
    const dup = await pool.query(
      `SELECT "id", "sender", "content", "imageUrl", "read", "clientId", "seq",
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
    read: row.read,
    createdAt: row.createdAtIso,
    seq: row.seq,
    clientId: row.clientId,
    duplicate: false,
  };
}

async function countUnreadAdmin(conversationId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM "ChatMessage" WHERE "conversationId" = $1 AND "sender" = 'visitor' AND "read" = false`,
    [conversationId]
  );
  return r.rows[0]?.n || 0;
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

/** 把一条已落库的消息广播给所有客服 + 该会话访客，并同步会话列表未读数 */
async function broadcastMessage(conversationId, message) {
  const envelope = { type: 'message', conversationId, message };
  broadcastToAdmins(envelope);
  broadcastToVisitors(conversationId, envelope);
  try {
    const unreadAdmin = await countUnreadAdmin(conversationId);
    broadcastToAdmins({
      type: 'convUpdate',
      conversationId,
      unreadAdmin,
      lastMessageAt: message.createdAt,
      lastSender: message.sender,
      lastPreview: message.content || (message.imageUrl ? '[image]' : ''),
    });
  } catch {
    /* 统计失败不影响消息推送 */
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
    // 握手阶段从 Cookie 解析出的后台身份（尚未决定角色）
    cookieAdminUser: null,
  };
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // ⭐ 握手阶段解析 Cookie 里的 ws_session 并预先验签。
  //    之前后台连不上就是因为 ws_session 是 HttpOnly，前端 JS 读不到，
  //    只能靠升级请求自动带上的 Cookie 来认身份（Cookie 不区分端口，天然可用）。
  //    注意：这里只"备好"身份，不直接认定角色 ——
  //    否则登录了 admin 的浏览器打开前台时，访客连接会被误当成客服连接。
  try {
    const cookies = parseCookies(req?.headers?.cookie);
    const token = cookies[SESSION_COOKIE];
    if (token) {
      const user = verifyAdminToken(token);
      if (user) ws.meta.cookieAdminUser = user;
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
        ws.meta = { ...ws.meta, authed: true, role: 'admin', userId: user.id };
        adminSockets.add(ws);
        send(ws, { type: 'authed', role: 'admin' });
        return;
      }
      if (msg.role === 'visitor') {
        const conv = await getConversation(msg.conversationId);
        if (!conv || !conv.guestToken || conv.guestToken !== msg.guestToken) {
          send(ws, { type: 'error', message: 'BAD_CONVERSATION' });
          ws.close();
          return;
        }
        ws.meta = {
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
        // 确定会话：visitor 从连接元数据取；admin 必须由客户端显式带 conversationId
        let conversationId = null;
        if (ws.meta.role === 'visitor') {
          conversationId = ws.meta.conversationId;
        } else if (ws.meta.role === 'admin') {
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
        const sender = ws.meta.role === 'admin' ? 'admin' : 'visitor';
        const content = typeof msg.content === 'string' ? msg.content.slice(0, 4000) : null;
        const imageUrl = typeof msg.imageUrl === 'string' ? msg.imageUrl.slice(0, 2000) : null;
        if (!content && !imageUrl) {
          send(ws, { type: 'error', message: 'EMPTY_MESSAGE' });
          return;
        }
        const clientId = typeof msg.clientId === 'string' && msg.clientId ? msg.clientId : null;
        const message = await insertMessage(conversationId, sender, content, imageUrl, clientId);
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

        // 实时更新后台列表（未读红点 / 预览）
        const unreadAdmin = await countUnreadAdmin(conversationId);
        broadcastToAdmins({
          type: 'convUpdate',
          conversationId,
          unreadAdmin,
          lastMessageAt: message.createdAt,
          lastSender: sender,
          lastPreview: content || (imageUrl ? '[image]' : ''),
        });
        return;
      }
      if (msg.type === 'read') {
        let conversationId = ws.meta.role === 'visitor' ? ws.meta.conversationId : msg.conversationId;
        if (!conversationId) return;
        // 客服读取 → 把游客发的未读标为已读；访客读取 → 把客服发的未读标为已读
        const side = ws.meta.role === 'admin' ? 'visitor' : 'admin';
        await markRead(conversationId, side);
        broadcastToAdmins({
          type: 'read',
          conversationId,
          by: ws.meta.role,
          unreadAdmin: await countUnreadAdmin(conversationId),
        });
        if (ws.meta.role === 'admin') {
          broadcastToVisitors(conversationId, { type: 'read', conversationId, by: 'admin' });
        }
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
        if (ws.meta.role === 'admin') broadcastToVisitors(conversationId, obj);
        else broadcastToAdmins(obj);
        return;
      }
    } catch (e) {
      console.error('[chat-ws] 处理消息出错:', e?.message || e);
      send(ws, { type: 'error', message: 'SERVER_ERROR' });
    }
  });

  ws.on('close', () => {
    if (ws.meta.role === 'admin') adminSockets.delete(ws);
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
