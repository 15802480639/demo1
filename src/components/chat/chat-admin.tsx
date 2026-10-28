'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';
import { ChatSocket, fetchWsToken, type ChatMsg, type ChatStatus } from '@/lib/chat-ws';
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
  // 兜底发送函数的最新实现（sendFallback 回调注册在只跑一次的 effect 里，
  // 直接引用会捕获旧闭包，用 ref 避免）
  const sendViaRestRef = useRef<
    (clientId: string, text: string | null, convId?: string | null) => Promise<void>
  >(async () => {});

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const upsert = useCallback((m: ChatMsg) => {
    setMessages((prev) => {
      // 1) 服务端回执替换同 clientId 的乐观临时消息
      if (m.clientId) {
        const idx = prev.findIndex((x) => x.clientId === m.clientId && x.id.startsWith('temp-'));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = m;
          return next;
        }
      }
      // 2) 已存在同 id → 忽略
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
      const list = (d.conversations || []).sort(
        (a: Conv, b: Conv) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      const cur = selectedRef.current;
      setConvs((prev) => {
        // 保留本地已知的会话（服务端列表按 lastMessageAt 排序，若本地有会话还没同步上去，
        // 不能直接丢掉），并用服务端未读数覆盖。
        const known = new Map(prev.map((c) => [c.id, c]));
        return list.map((c) => {
          const old = known.get(c.id);
          const merged = old ? { ...old, ...c } : c;
          // ⚠️ 竞态兜底：客服正在看的会话，未读数一律按 0 显示。
          //    否则 markRead 落库前的那一次轮询会把旧未读数又刷回来（红点反复出现）。
          return cur && merged.id === cur ? { ...merged, unreadAdmin: 0 } : merged;
        });
      });
    } catch {
      /* noop */
    }
  }, []);

  // 初始化：拉列表 + 建 WS
  useEffect(() => {
    refreshList();
    // ⚠️ admin 鉴权：ws_session 是 HttpOnly，前端 document.cookie 读不到，
    //    必须由服务端签发短时令牌（/api/chat/ws-token）。
    //    服务端还有「握手阶段解析 Cookie」作为第二重兜底。
    const sock = new ChatSocket('admin', async () => ({ token: await fetchWsToken() }));
    socketRef.current = sock;

    sock.on('authed', () => setConn('open'));
    sock.on('status', (s: ChatStatus) => setConn(s));

    sock.on('convUpdate', (ev: any) => {
      // ⚠️ 注意：不要在 setConvs 的更新函数里调 refreshList（副作用 + 严格模式会重复执行）
      setConvs((prev) => {
        const idx = prev.findIndex((c) => c.id === ev.conversationId);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          // ⚠️ 客服正在看的会话不累计未读（消息已实时显示在面板里），
          //    否则红点会跟着每条新消息跳动，体验上等于"未读清不掉"。
          unreadAdmin: selectedRef.current === ev.conversationId ? 0 : (ev.unreadAdmin ?? 0),
          lastPreview: ev.lastPreview,
          lastSender: ev.lastSender,
          lastMessageAt: ev.lastMessageAt,
        };
        return next.sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
    });

    // 客服读过的会话 → 未读数归零（服务端回推）
    sock.on('read', (ev: any) => {
      setConvs((prev) =>
        prev.map((c) =>
          c.id === ev.conversationId ? { ...c, unreadAdmin: ev.unreadAdmin ?? 0 } : c
        )
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

    // WS 未在超时内回执 → 用同一 clientId 走 REST 补发（幂等）
    sock.on('sendFallback', (p: any) => {
      sendViaRestRef.current(p.clientId, p.content ?? null, p.conversationId ?? null);
    });

    sock.connect();
    return () => sock.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⭐ 会话列表轮询兜底：WS 断线/未鉴权/消息经 REST 兜底时，
  //    新会话与新消息也必须能在几秒内出现在列表里（此前只在 mount 加载一次）。
  useEffect(() => {
    refreshList();
    const iv = setInterval(() => {
      refreshList();
    }, 3000);
    return () => clearInterval(iv);
  }, [refreshList]);

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
    // ⭐ 本地立刻清红点：不等服务端回推（否则界面会一直挂着旧的未读数）。
    //    服务端 markRead 成功后还会再广播一次 read 事件做最终对齐。
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unreadAdmin: 0 } : c)));
    setLoadingConv(true);
    try {
      const d = await getConversation(id);
      setMessages(d.messages || []);
      await markRead(id).catch(() => {});
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
    const temp: ChatMsg = {
      id: 'temp-' + clientId,
      sender: 'admin',
      content: text,
      read: false,
      createdAt: new Date().toISOString(),
      clientId,
    };
    setMessages((prev) => [...prev, temp]);
    scrollBottom();
    // ⚠️ admin 走 WS 时必须显式带 conversationId（服务端无法从连接元数据推断）
    if (!socketRef.current?.sendMessage(text, null, clientId, selectedId)) {
      await sendViaRest(clientId, text);
    }
  }

  /** REST 兜底发送：带同一 clientId，服务端按唯一索引幂等，不会重复落库。
   *  用 selectedRef 取当前会话（sendFallback 回调注册在只跑一次的 effect 里，闭包会捕获旧的 selectedId）。 */
  async function sendViaRest(clientId: string, text: string | null, convId?: string | null) {
    const cid = convId || selectedRef.current;
    if (!cid) return;
    try {
      const d = await sendMessageRest({
        conversationId: cid,
        content: text || undefined,
        clientId,
      });
      upsert({ ...d.message, clientId });
      socketRef.current?.markAcked(clientId);
    } catch {
      /* ignore */
    }
  }
  // 始终指向最新实现
  sendViaRestRef.current = sendViaRest;

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
        .then((d) => {
          // 合并而非整体覆盖：保留尚未收到回执的乐观临时消息
          setMessages((prev) => {
            const next = [...prev];
            for (const m of d.messages || []) {
              const idx = next.findIndex(
                (x) => x.id === m.id || (m.clientId && x.clientId === m.clientId)
              );
              if (idx >= 0) next[idx] = m;
              else next.push(m);
            }
            return next;
          });
        })
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

  // 渲染前排序：以服务端 seq（单调序号，与时区无关）为主，
  // 乐观临时消息没有 seq → 用 createdAt 兜底，保证客服回复与访客提问严格按发生顺序交错。
  const sortedMessages = useMemo(
    () =>
      [...messages].sort((a, b) => {
        const sa = a.seq ?? null;
        const sb = b.seq ?? null;
        if (sa != null && sb != null && sa !== sb) return sa - sb;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
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
