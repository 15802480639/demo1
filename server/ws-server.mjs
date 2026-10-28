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

if (!DATABASE_URL) {
  console.error('[chat-ws] 缺少 DATABASE_URL，无法启动');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ---------- 鉴权：复用 Next auth.ts 的 HMAC-SHA256 无状态 token 校验 ----------
function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.id) return null;
    return data; // { id, role, ... }
  } catch {
    return null;
  }
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

// ---------- HTTP（健康检查）+ WS ----------
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, admins: adminSockets.size, visitors: visitorSockets.size }));
    return;
  }
  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('Upgrade Required');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.meta = { authed: false, role: null, conversationId: null, guestToken: null, userId: null };
  ws.on('pong', () => {
    ws.isAlive = true;
  });

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
        const user = verifyAdminToken(msg.token);
        if (!user || user.role !== 'admin') {
          send(ws, { type: 'error', message: 'FORBIDDEN' });
          ws.close();
          return;
        }
        ws.meta = { authed: true, role: 'admin', userId: user.id };
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
