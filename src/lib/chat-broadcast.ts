// 客服消息广播桥接 —— 让 REST 落库的路径也能被 WS 进程实时推送出去
//
// 背景（2026-10-28 实测）：
//   站内客服是两套进程：
//     - Next.js（standalone）→ 负责 REST API（建会话 / 历史 / 兜底发送 / 已读）
//     - server/ws-server.mjs（:4000）→ 负责 WebSocket 实时广播
//   两者共享同一个 PostgreSQL，但互不知晓。
//   于是：走 WS 的消息秒到；走 REST 兜底的消息虽然落库了，
//   但 WS 进程不知道 → 对方只能靠 3 秒轮询才看到（"不实时"）。
//
// 对策：REST 落库成功后回调 WS 进程的内部广播接口（仅本机 + 内部密钥）。
//   幂等由 clientId 唯一索引保证，重复广播也无副作用（前端按 id 去重）。

const WS_INTERNAL_URL =
  process.env.CHAT_WS_INTERNAL_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://127.0.0.1:4000/internal/broadcast'
    : 'http://127.0.0.1:4000/internal/broadcast');

function internalSecret(): string {
  return process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
}

/**
 * 通知 WS 进程把这条已落库的消息广播出去。
 * 失败静默 —— 广播只是"锦上添花"，失败时前端仍有轮询兜底，绝不能因此让接口报错。
 */
export async function broadcastChatMessage(
  conversationId: string,
  message: {
    id: string;
    sender: string;
    content?: string | null;
    imageUrl?: string | null;
    read: boolean;
    createdAt: string;
    clientId?: string | null;
    seq?: number | null;
  }
): Promise<void> {
  try {
    await fetch(WS_INTERNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret(),
      },
      body: JSON.stringify({ conversationId, message }),
      cache: 'no-store',
    });
  } catch {
    /* WS 服务没起或网络不通 → 静默失败，前端轮询兜底 */
  }
}
