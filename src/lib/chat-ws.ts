'use client';

// 浏览器端 WebSocket 客户端：封装连接、鉴权、自动重连、事件分发。
// 后台(admin)凭 ws_session cookie 校验；访客(visitor)凭 conversationId+guestToken 校验。

export type ChatMsg = {
  id: string;
  sender: 'visitor' | 'admin' | 'system';
  content?: string | null;
  imageUrl?: string | null;
  /** 附带的商品 slug（访客把商品发给客服时携带）；两端据此渲染商品卡片 */
  productSlug?: string | null;
  read: boolean;
  createdAt: string;
  clientId?: string | null;
  /** 单调序号：与时区无关的稳定排序键 */
  seq?: number | null;
};

type Listener = (payload: any) => void;

/** 计算 WS 地址：本地开发走 :4000；生产走同域 /ws（由 Nginx 反代到 WS 服务） */
export function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `ws://${hostname}:4000`;
  }
  const wsProto = protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProto}://${window.location.host}/ws`;
}

/** 读取 Next 的会话 cookie，供 admin WS 鉴权（注意：ws_session 是 HttpOnly，这里通常读不到） */
export function getSessionCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)ws_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/**
 * 取一次性 WS 鉴权令牌（后台专用）。
 * ws_session 是 HttpOnly → 前端读不到 → 必须由服务端签发短时令牌。
 * 失败返回空串（服务端还有 Cookie 握手鉴权兜底）。
 */
export async function fetchWsToken(): Promise<string> {
  try {
    const res = await fetch('/api/chat/ws-token', { cache: 'no-store' });
    if (!res.ok) return '';
    const d = await res.json();
    return typeof d.token === 'string' ? d.token : '';
  } catch {
    return '';
  }
}

export type ChatStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export class ChatSocket {
  private ws: WebSocket | null = null;
  private role: 'admin' | 'agent' | 'visitor';
  private auth: any;
  private listeners: Record<string, Listener[]> = {};
  private reconnectAttempts = 0;
  private closedByUser = false;
  private reconnectTimer: any = null;
  status: ChatStatus = 'connecting';
  /** 已收到服务端回执（确认落库）的 clientId 集合 */
  private acked = new Set<string>();
  /** clientId -> 等待回执的超时定时器 */
  private pendingAcks = new Map<string, any>();

  /**
   * @param role 角色：admin（后台）/ agent（H5 客服）/ visitor（访客）
   * @param auth 鉴权载荷；也可以传一个返回载荷的函数/Promise（客服需先取短时令牌）
   */
  constructor(role: 'admin' | 'agent' | 'visitor', auth: any) {
    this.role = role;
    this.auth = auth;
  }

  on(event: string, cb: Listener) {
    (this.listeners[event] ||= []).push(cb);
  }
  private emit(event: string, payload: any) {
    (this.listeners[event] || []).forEach((cb) => cb(payload));
  }

  connect() {
    this.closedByUser = false;
    this.open();
  }

  /** 解析鉴权载荷（支持函数 / Promise，同步载荷直接返回） */
  private async resolveAuth(): Promise<any> {
    const a = this.auth;
    if (typeof a === 'function') return (await a()) || {};
    if (a && typeof a.then === 'function') return (await a) || {};
    return a || {};
  }

  private async open() {
    if (typeof window === 'undefined') return;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(getWsUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = async () => {
      this.reconnectAttempts = 0;
      this.setStatus('open');
      // 鉴权载荷可能是异步的（admin 要先取短时令牌）
      const auth = await this.resolveAuth();
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'auth', role: this.role, ...auth }));
    };
    ws.onmessage = (ev) => {
      try {
        this.handle(JSON.parse(ev.data));
      } catch {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      this.setStatus('closed');
      if (!this.closedByUser) this.scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    };
  }

  private handle(msg: any) {
    if (!msg || !msg.type) return;
    if (msg.type === 'authed') this.emit('authed', msg);
    else if (msg.type === 'message') {
      // 服务端回执：同 clientId 的消息已确认落库
      const cid = msg.message?.clientId;
      if (cid && this.pendingAcks.has(cid)) {
        clearTimeout(this.pendingAcks.get(cid));
        this.pendingAcks.delete(cid);
        this.acked.add(cid);
      }
      this.emit('message', msg);
    } else if (msg.type === 'convUpdate') this.emit('convUpdate', msg);
    else if (msg.type === 'read') this.emit('read', msg);
    else if (msg.type === 'typing') this.emit('typing', msg);
    else if (msg.type === 'error') {
      // 服务端明确拒绝（如 NO_CONVERSATION）：解除该 clientId 的等待，让调用方走 REST 兜底
      if (msg.clientId && this.pendingAcks.has(msg.clientId)) {
        clearTimeout(this.pendingAcks.get(msg.clientId));
        this.pendingAcks.delete(msg.clientId);
      }
      this.emit('error', msg);
    }
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private setStatus(s: ChatStatus) {
    this.status = s;
    this.emit('status', s);
  }

  isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(obj: any): boolean {
    if (this.isOpen()) {
      this.ws!.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  /**
   * 发送消息。返回 true 表示帧已发出（不代表服务端已落库）。
   * 会等待服务端回执（回显的 message 带同一 clientId）：
   *   - ackTimeoutMs 内收到回执 → 触发 'acked'
   *   - 超时或服务端返回 error → 触发 'sendFallback'，由上层改走 REST 补发
   * conversationId：visitor 由服务端从连接元数据推断；admin 必须显式传入。
   */
  sendMessage(
    content: string | null,
    imageUrl: string | null,
    clientId: string,
    conversationId?: string | null,
    productSlug?: string | null
  ) {
    const payload: any = { type: 'message', content, imageUrl, clientId };
    if (conversationId) payload.conversationId = conversationId;
    if (productSlug) payload.productSlug = productSlug;

    const ok = this.send(payload);
    if (!ok) return false;

    // 已确认过（重复发送同一条）→ 直接视为成功
    if (this.acked.has(clientId)) {
      this.emit('acked', { clientId });
      return true;
    }

    if (!this.pendingAcks.has(clientId)) {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(clientId);
        this.emit('sendFallback', {
          clientId,
          content,
          imageUrl,
          conversationId,
          productSlug,
        });
      }, 3000);
      this.pendingAcks.set(clientId, timer);
    }
    return true;
  }
  /** 标记某 clientId 已确认（REST 补发成功后调用） */
  markAcked(clientId: string) {
    this.acked.add(clientId);
    const t = this.pendingAcks.get(clientId);
    if (t) {
      clearTimeout(t);
      this.pendingAcks.delete(clientId);
    }
  }

  isAcked(clientId: string) {
    return this.acked.has(clientId);
  }

  sendRead(conversationId: string) {
    return this.send({ type: 'read', conversationId });
  }
  sendTyping(conversationId: string, isTyping: boolean) {
    return this.send({ type: 'typing', conversationId, isTyping });
  }
  close() {
    this.closedByUser = true;
    clearTimeout(this.reconnectTimer);
    for (const t of this.pendingAcks.values()) clearTimeout(t);
    this.pendingAcks.clear();
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
  }
}
