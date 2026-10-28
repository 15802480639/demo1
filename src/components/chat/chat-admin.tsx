'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { ChatSocket, getSessionCookie, type ChatMsg, type ChatStatus } from '@/lib/chat-ws';
import {
  listConversations,
  getConversation,
  sendMessageRest,
  markRead,
  setStatus,
} from '@/lib/chat-api';

type Conv = {
  id: string;
  visitorName: string | null;
  contactType: string;
  contact: string | null;
  status: string;
  locale: string;
  lastMessageAt: string;
  unreadAdmin: number;
  lastPreview: string;
  lastSender: string | null;
  user: { name: string | null; username: string | null; email: string | null } | null;
};

function fmtTime(s: string) {
  try {
    return new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
function fromNow(s: string) {
  try {
    const diff = Date.now() - new Date(s).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  } catch {
    return '';
  }
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 660;
    g.gain.value = 0.06;
    o.start();
    setTimeout(() => {
      try {
        o.stop();
        ctx.close();
      } catch {
        /* noop */
      }
    }, 200);
  } catch {
    /* noop */
  }
}

export function ChatAdmin() {
  const { locale, dict } = useLocale();
  const t = dict.admin;

  const [convs, setConvs] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [conn, setConn] = useState<ChatStatus>('connecting');
  const [loadingConv, setLoadingConv] = useState(false);

  const socketRef = useRef<ChatSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const upsert = useCallback((m: ChatMsg) => {
    setMessages((prev) => {
      if (m.clientId) {
        const idx = prev.findIndex((x) => x.clientId === m.clientId && x.id.startsWith('temp-'));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = m;
          return next;
        }
      }
      if (prev.some((x) => x.id === m.id)) return prev;
      return [...prev, m];
    });
  }, []);

  const scrollBottom = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const d = await listConversations();
      setConvs(
        (d.conversations || []).sort(
          (a: Conv, b: Conv) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
      );
    } catch {
      /* noop */
    }
  }, []);

  // 初始化：拉列表 + 建 WS
  useEffect(() => {
    refreshList();
    const sock = new ChatSocket('admin', { token: getSessionCookie() });
    socketRef.current = sock;

    sock.on('authed', () => setConn('open'));
    sock.on('status', (s: ChatStatus) => setConn(s));

    sock.on('convUpdate', (ev: any) => {
      setConvs((prev) =>
        prev
          .map((c) =>
            c.id === ev.conversationId
              ? {
                  ...c,
                  unreadAdmin: ev.unreadAdmin,
                  lastPreview: ev.lastPreview,
                  lastSender: ev.lastSender,
                  lastMessageAt: ev.lastMessageAt,
                }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );
    });

    sock.on('message', (ev: any) => {
      const { conversationId, message } = ev;
      if (conversationId === selectedRef.current) {
        upsert(message);
        // 客服正在看该会话 → 立即标已读
        markRead(conversationId).catch(() => {});
        sock.sendRead(conversationId);
      } else if (message.sender === 'visitor') {
        // 新访客消息且未在查看 → 红点 + 响铃 + 桌面通知
        beep();
        requestNotify(message.content || t.imAttach, conversationId);
      }
    });

    sock.connect();
    return () => sock.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestNotify(body: string, conversationId: string) {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'granted') {
        new Notification(t.imDesktopNotify, { body });
      } else if (Notification.permission !== 'denied' && !notifiedRef.current) {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification(t.imDesktopNotify, { body });
        });
        notifiedRef.current = true;
      }
    } catch {
      /* noop */
    }
  }

  async function selectConv(id: string) {
    setSelectedId(id);
    setLoadingConv(true);
    try {
      const d = await getConversation(id);
      setMessages(d.messages || []);
      markRead(id).catch(() => {});
      socketRef.current?.sendRead(id);
    } catch {
      /* noop */
    } finally {
      setLoadingConv(false);
      scrollBottom();
    }
  }

  async function send(text: string | null) {
    if (!selectedId) return;
    const clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    // 不先塞临时消息：以 WS 回显 / REST 返回为准，避免轮询覆盖时产生重复
    if (!socketRef.current?.sendMessage(text, null, clientId)) {
      try {
        const d = await sendMessageRest({ conversationId: selectedId, content: text || undefined });
        upsert({ ...d.message, clientId });
      } catch {
        /* ignore */
      }
    }
  }

  function onSend() {
    const v = input.trim();
    if (!v) return;
    setInput('');
    send(v);
  }

  // 选中会话后持续轮询兜底：WS 抖动/丢消息也能在数秒内看到新消息
  useEffect(() => {
    if (!selectedId) return;
    const iv = setInterval(() => {
      getConversation(selectedId)
        .then((d) => setMessages(d.messages || []))
        .catch(() => {});
    }, 3000);
    return () => clearInterval(iv);
  }, [selectedId]);

  async function toggleClose() {
    if (!selectedId) return;
    const cur = convs.find((c) => c.id === selectedId);
    const next = cur?.status === 'open' ? 'closed' : 'open';
    try {
      await setStatus(selectedId, next);
      setConvs((prev) => prev.map((c) => (c.id === selectedId ? { ...c, status: next } : c)));
    } catch {
      /* noop */
    }
  }

  const sel = convs.find((c) => c.id === selectedId) || null;
  const totalUnread = convs.reduce((a, c) => a + (c.unreadAdmin || 0), 0);

  // 渲染前严格按发送时间升序排序，保证客服回复与访客提问交错正确
  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl mb-1">{t.imTitle}</h1>
          <p className="text-xs text-muted">
            {conn === 'open' ? '● ' + (locale === 'ko' ? '연결됨' : locale === 'zh' ? '已连接' : 'Connected') : '○ ' + t.imConnLost}
            {totalUnread > 0 && ` · ${totalUnread} ${locale === 'ko' ? '안읽음' : locale === 'zh' ? '条未读' : 'unread'}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] border border-line rounded-lg overflow-hidden min-h-[60vh]">
        {/* 会话列表 */}
        <div className="border-r border-line overflow-y-auto max-h-[70vh]">
          {convs.length === 0 ? (
            <p className="text-sm text-muted p-4">{t.imNoConversation}</p>
          ) : (
            convs.map((c) => {
              const isSel = c.id === selectedId;
              const name = c.visitorName || c.user?.name || c.user?.username || c.user?.email || (locale === 'ko' ? '방문자' : locale === 'zh' ? '访客' : 'Visitor');
              return (
                <button
                  key={c.id}
                  onClick={() => selectConv(c.id)}
                  className={`w-full text-left px-3 py-3 border-b border-line flex gap-3 items-start ${
                    isSel ? 'bg-ink/5' : 'hover:bg-line/20'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{name}</span>
                      {c.unreadAdmin > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center">
                          {c.unreadAdmin > 99 ? '99+' : c.unreadAdmin}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{c.lastPreview || '—'}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {fromNow(c.lastMessageAt)}
                      {c.contact && ` · ${c.contactType === 'email' ? '✉' : '☎'} ${c.contact}`}
                      {c.status === 'closed' && ` · ${t.imClosed}`}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 对话区 */}
        <div className="flex flex-col min-h-[60vh]">
          {!sel ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted">
              {t.imSelectConv}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <div className="text-sm">
                  {sel.visitorName || sel.user?.name || sel.user?.username || (locale === 'ko' ? '방문자' : locale === 'zh' ? '访客' : 'Visitor')}
                  {sel.contact && (
                    <span className="text-xs text-muted ml-2">
                      {sel.contactType === 'email' ? '✉' : '☎'} {sel.contact}
                    </span>
                  )}
                </div>
                <button onClick={toggleClose} className="text-xs px-3 py-1.5 border border-line hover:border-ink">
                  {sel.status === 'open' ? t.imClose : t.imReopen}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-bg max-h-[55vh]">
                {loadingConv ? (
                  <p className="text-xs text-muted text-center mt-6">{t.imRetry}…</p>
                  ) : (
                  sortedMessages.map((m) => {
                    const mine = m.sender === 'admin';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                            mine ? 'bg-ink text-white rounded-br-sm' : 'bg-line/30 text-ink rounded-bl-sm'
                          }`}
                        >
                          {m.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.imageUrl} alt="" className="max-w-full rounded-lg max-h-48 object-cover" />
                          ) : (
                            <span className="whitespace-pre-wrap break-words">{m.content}</span>
                          )}
                          <div className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-muted'}`}>
                            {fmtTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-line p-2 flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  rows={1}
                  placeholder={sel.status === 'closed' ? t.imClosed : t.imInputPh}
                  disabled={sel.status === 'closed'}
                  className="flex-1 resize-none border border-line px-3 py-2 text-sm outline-none focus:border-ink max-h-24 disabled:opacity-60"
                />
                <button onClick={onSend} disabled={sel.status === 'closed'} className="btn-gold px-4 py-2 text-sm disabled:opacity-60">
                  {t.imSend}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
