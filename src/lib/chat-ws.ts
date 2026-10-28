'use client';

// 浏览器端 WebSocket 客户端：封装连接、鉴权、自动重连、事件分发。
// 后台(admin)凭 ws_session cookie 校验；访客(visitor)凭 conversationId+guestToken 校验。

export type ChatMsg = {
  id: string;
  sender: 'visitor' | 'admin' | 'system';
  content?: string | null;
  imageUrl?: string | null;
  read: boolean;
  createdAt: string;
  clientId?: string | null;
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

/** 读取 Next 的会话 cookie，供 admin WS 鉴权 */
export function getSessionCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)ws_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export type ChatStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export class ChatSocket {
  private ws: WebSocket | null = null;
  private role: 'admin' | 'visitor';
  private auth: any;
  private listeners: Record<string, Listener[]> = {};
  private reconnectAttempts = 0;
  private closedByUser = false;
  private reconnectTimer: any = null;
  status: ChatStatus = 'connecting';

  constructor(role: 'admin' | 'visitor', auth: any) {
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

  private open() {
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
    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('open');
      ws.send(JSON.stringify({ type: 'auth', role: this.role, ...this.auth }));
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
    else if (msg.type === 'message') this.emit('message', msg);
    else if (msg.type === 'convUpdate') this.emit('convUpdate', msg);
    else if (msg.type === 'read') this.emit('read', msg);
    else if (msg.type === 'typing') this.emit('typing', msg);
    else if (msg.type === 'error') this.emit('error', msg);
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
  sendMessage(content: string | null, imageUrl: string | null, clientId: string) {
    return this.send({ type: 'message', content, imageUrl, clientId });
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
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
  }
}
