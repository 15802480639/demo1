'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSocket, fetchWsToken, type ChatMsg, type ChatStatus } from '@/lib/chat-ws';
import {
  listConversations,
  getConversation,
  sendMessageRest,
  markRead,
  setStatus,
  uploadImage,
} from '@/lib/chat-api';
import { ChatProductCard } from '@/components/chat/chat-product-card';
import { ChatMessageText } from '@/components/chat/chat-message-text';
import { csDict } from '@/lib/cs-dict';

// H5 客服工作台 —— 手机单栏版
//
// 与桌面版 /admin/chat 的差异：
//   · 单栏：会话列表页 ⇄ 聊天页，点进去有返回按钮（桌面版是左右双栏）
//   · 提醒用「声音 + 振动」而非桌面通知（iOS Safari 不支持 Notification API）
//   · 输入框吸底，适配移动端键盘弹起
//   · 未读数按当前客服各自的游标计算（后端 ChatReadCursor）
//   · 界面固定韩文（客服团队为韩国人），文案见 src/lib/cs-dict.ts
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
    return new Date(s).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function fromNow(s: string) {
  try {
    const diff = Date.now() - new Date(s).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return csDict.justNow;
    if (m < 60) return `${m}${csDict.minutesAgo}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${csDict.hoursAgo}`;
    return `${Math.floor(h / 24)}${csDict.daysAgo}`;
  } catch {
    return '';
  }
}

/** 访客显示名：注册账号名优先（子建要求）→ 昵称 → 邮箱 → 访客 */
function displayName(c: Conv) {
  return (
    c.user?.username ||
    c.visitorName ||
    c.user?.name ||
    c.user?.email ||
    '방문자'
  );
}

/** 新消息提醒：声音 + 振动（iOS 上没有可用的桌面通知 API） */
function notify() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([80, 60, 80]);
    }
  } catch {
    /* noop */
  }
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.stop(ctx.currentTime + 0.26);
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* noop */
      }
    }, 400);
  } catch {
    /* noop */
  }
}

export function ChatAgentMobile() {
  const router = useRouter();

  const [view, setView] = useState<'list' | 'chat'>('list');
  const [convs, setConvs] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [conn, setConn] = useState<ChatStatus>('connecting');
  const [loadingConv, setLoadingConv] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agentName, setAgentName] = useState('');

  const socketRef = useRef<ChatSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
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
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const d = await listConversations();
      const list = (d.conversations || []).sort(
        (a: Conv, b: Conv) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      const cur = selectedRef.current;
      setConvs((prev) => {
        const known = new Map(prev.map((c) => [c.id, c]));
        return list.map((c) => {
          const old = known.get(c.id);
          const merged = old ? { ...old, ...c } : c;
          // 正在看的会话未读一律按 0 显示（否则 markRead 落库前的轮询会把旧未读刷回来）
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
    // ⚠️ 鉴权：cs_session 是 HttpOnly，前端读不到 → 必须由服务端签发短时令牌
    const sock = new ChatSocket('agent', async () => ({ token: await fetchWsToken() }));
    socketRef.current = sock;

    sock.on('authed', () => setConn('open'));
    sock.on('status', (s: ChatStatus) => setConn(s));

    sock.on('convUpdate', (ev: any) => {
      setConvs((prev) => {
        const idx = prev.findIndex((c) => c.id === ev.conversationId);
        if (idx < 0) {
          // 新会话（服务端列表还没同步）→ 下一轮轮询会补上
          return prev;
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          unreadAdmin:
            selectedRef.current === ev.conversationId ? 0 : (ev.unreadAdmin ?? 0),
          lastPreview: ev.lastPreview,
          lastSender: ev.lastSender,
          lastMessageAt: ev.lastMessageAt,
        };
        return next.sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
    });

    sock.on('message', (ev: any) => {
      const { conversationId, message } = ev;
      if (conversationId === selectedRef.current) {
        upsert(message);
        scrollBottom();
        // 正在看这个会话 → 立即标已读（推进自己的游标）
        markRead(conversationId).catch(() => {});
        sock.sendRead(conversationId);
      } else if (message.sender === 'visitor') {
        // 其他会话的新访客消息 → 声音 + 振动提醒
        notify();
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

  // 会话列表轮询兜底：WS 断线/消息经 REST 兜底时，新会话与新消息仍要能出现
  useEffect(() => {
    refreshList();
    const iv = setInterval(() => refreshList(), 3000);
    return () => clearInterval(iv);
  }, [refreshList]);

  // 选中会话后持续轮询：WS 抖动/丢消息也能在几秒内看到新消息
  useEffect(() => {
    if (!selectedId) return;
    const iv = setInterval(() => {
      getConversation(selectedId)
        .then((d) => {
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

  async function openConv(id: string) {
    setSelectedId(id);
    setView('chat');
    // 本地立刻清红点，不等服务端回推
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

  function backToList() {
    setView('list');
    setSelectedId(null);
    setMessages([]);
    refreshList();
  }

  async function send(text: string | null, imageUrl: string | null = null) {
    if (!selectedId) return;
    const clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const temp: ChatMsg = {
      id: 'temp-' + clientId,
      sender: 'admin',
      content: text,
      imageUrl,
      read: false,
      createdAt: new Date().toISOString(),
      clientId,
    };
    setMessages((prev) => [...prev, temp]);
    scrollBottom();
    // ⚠️ 客服走 WS 时必须显式带 conversationId（服务端无法从连接元数据推断）
    if (!socketRef.current?.sendMessage(text, imageUrl, clientId, selectedId)) {
      await sendViaRest(clientId, text);
    }
  }

  /** REST 兜底发送：带同一 clientId，服务端按唯一索引幂等，不会重复落库 */
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
  sendViaRestRef.current = sendViaRest;

  function onSend() {
    const v = input.trim();
    if (!v) return;
    setInput('');
    send(v);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选同一张
    if (!file || !selectedId) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await send(null, url);
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  }

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

  async function logout() {
    try {
      await fetch('/api/cs/logout', { method: 'POST' });
    } catch {
      /* noop */
    }
    window.location.assign('/cs/login');
  }

  // 渲染前排序：以服务端 seq（单调序号，与时区无关）为主
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

  const sel = convs.find((c) => c.id === selectedId) || null;
  const totalUnread = convs.reduce((a, c) => a + (c.unreadAdmin || 0), 0);

  // ============ 会话列表页 ============
  if (view === 'list') {
    return (
      <div className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-line px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-medium">{csDict.workbenchTitle}</h1>
              <p className="text-[11px] text-muted mt-0.5">
                {conn === 'open'
                  ? csDict.connOpen
                  : conn === 'reconnecting'
                    ? csDict.connReconnecting
                    : csDict.connLost}
                {totalUnread > 0 && ` · ${totalUnread}${csDict.unreadSuffix}`}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 border border-line text-muted active:bg-line/30"
            >
              {csDict.logout}
            </button>
          </div>
        </header>

        <main className="flex-1">
          {convs.length === 0 ? (
            <p className="text-sm text-muted text-center py-16">{csDict.emptyList}</p>
          ) : (
            convs.map((c) => (
              <button
                key={c.id}
                onClick={() => openConv(c.id)}
                className="w-full text-left px-4 py-3.5 border-b border-line flex gap-3 items-start active:bg-line/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{displayName(c)}</span>
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
                    {c.status === 'closed' && ` · ${csDict.endedBadge}`}
                  </p>
                </div>
              </button>
            ))
          )}
        </main>
      </div>
    );
  }

  // ============ 聊天页 ============
  return (
    <div className="h-dvh flex flex-col bg-bg">
      <header className="shrink-0 bg-bg/95 backdrop-blur border-b border-line px-3 py-2.5 flex items-center gap-3">
        <button
          onClick={backToList}
          className="shrink-0 w-9 h-9 flex items-center justify-center text-lg active:bg-line/30"
          aria-label={csDict.backToList}
        >
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{sel ? displayName(sel) : csDict.conversation}</div>
          <div className="text-[11px] text-muted truncate">
            {sel?.contact && `${sel.contactType === 'email' ? '✉' : '☎'} ${sel.contact}`}
            {sel?.status === 'closed' && ` · ${csDict.endedBadge}`}
          </div>
        </div>
        {sel && (
          <button
            onClick={toggleClose}
            className="shrink-0 text-[11px] px-2.5 py-1.5 border border-line text-muted active:bg-line/30"
          >
            {sel.status === 'open' ? csDict.closeConv : csDict.reopenConv}
          </button>
        )}
      </header>

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {loadingConv ? (
          <p className="text-xs text-muted text-center mt-6">{csDict.loading}</p>
        ) : (
          sortedMessages.map((m) => {
            const mine = m.sender === 'admin';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-ink text-white rounded-br-sm' : 'bg-surface-2 text-ink rounded-bl-sm border border-line'
                  }`}
                >
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt="" className="max-w-full rounded-lg max-h-48 object-cover" />
                  ) : m.content ? (
                    <ChatMessageText content={m.content} />
                  ) : null}
                  {/* 访客发来的商品 → 可点击的商品卡片（价格实时查，不存快照）
                      ⚠️ 客服是韩国人 → 卡片文案与商品名固定韩文，不跟访客语种走 */}
                  {m.productSlug ? (
                    <ChatProductCard slug={m.productSlug} locale="ko" tone="light" />
                  ) : null}
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

      <div className="shrink-0 border-t border-line bg-bg px-2 py-2 flex items-end gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickImage}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sel?.status === 'closed'}
          className="shrink-0 w-10 h-10 flex items-center justify-center border border-line text-muted disabled:opacity-40 active:bg-line/30"
          aria-label={csDict.sendImage}
        >
          {uploading ? '…' : '＋'}
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          placeholder={sel?.status === 'closed' ? csDict.inputPhClosed : csDict.inputPh}
          disabled={sel?.status === 'closed'}
          className="flex-1 resize-none border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink max-h-24 disabled:opacity-60"
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || sel?.status === 'closed'}
          className="shrink-0 h-10 px-4 bg-ink text-white text-sm disabled:opacity-40"
        >
          {csDict.send}
        </button>
      </div>
    </div>
  );
}
