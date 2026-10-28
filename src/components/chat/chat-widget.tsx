'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/i18n/locale-provider';
import { ChatSocket, type ChatMsg, type ChatStatus } from '@/lib/chat-ws';
import {
  createConversation,
  getConversation,
  sendMessageRest,
  markRead,
  uploadImage,
} from '@/lib/chat-api';

const LS_ID = 'chat_conv_id';
const LS_GUEST = 'chat_guest';

function fmtTime(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.start();
    setTimeout(() => {
      try {
        o.stop();
        ctx.close();
      } catch {
        /* noop */
      }
    }, 180);
  } catch {
    /* noop */
  }
}

export function ChatWidget() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const pathname = usePathname() || '';
  // 后台管理页不显示站内客服入口（提前 return 必须放在所有 hooks 之后，遵守 hooks 规则）
  const isAdmin = /^\/[a-z-]+\/admin(\/|$)/.test(pathname);

  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const [convId, setConvId] = useState<string | null>(null);
  const [guest, setGuest] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState('');
  const [wsDown, setWsDown] = useState(false);
  const [conn, setConn] = useState<ChatStatus>('connecting');
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone' | 'none'>('none');
  const [contact, setContact] = useState('');
  const [starting, setStarting] = useState(false);

  const socketRef = useRef<ChatSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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

  const setupSocket = useCallback(
    (id: string, g: string) => {
      const sock = new ChatSocket('visitor', { conversationId: id, guestToken: g });
      socketRef.current = sock;
      sock.on('status', (s: ChatStatus) => {
        setConn(s);
        if (s === 'open') setWsDown(false);
        if (s === 'reconnecting') {
          setTimeout(() => {
            if (sock.status !== 'open') setWsDown(true);
          }, 4000);
        }
      });
      sock.on('message', (ev: any) => {
        const m: ChatMsg = ev.message;
        if (ev.conversationId !== id) return;
        upsert(m);
        if (m.sender === 'admin' && !openRef.current) {
          setUnread((u) => u + 1);
          beep();
        }
        scrollBottom();
      });
      sock.connect();
    },
    [upsert, scrollBottom]
  );

  // 初始化：从 localStorage 恢复会话
  useEffect(() => {
    if (isAdmin) return;
    const id = localStorage.getItem(LS_ID);
    const g = localStorage.getItem(LS_GUEST);
    if (id && g) {
      setConvId(id);
      setGuest(g);
    }
  }, []);

  // 会话就绪后：拉历史 + 建 WS
  useEffect(() => {
    if (!convId || !guest) return;
    getConversation(convId, guest)
      .then((d) => setMessages(d.messages || []))
      .catch(() => {});
    setupSocket(convId, guest);
    return () => socketRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, guest]);

  // 打开面板：清未读 + 标记已读
  useEffect(() => {
    if (open && convId && guest) {
      setUnread(0);
      markRead(convId, guest).catch(() => {});
      socketRef.current?.sendRead(convId);
      scrollBottom();
    }
  }, [open, convId, guest, scrollBottom]);

  // WS 断线兜底：轮询拉取
  useEffect(() => {
    if (!wsDown || !convId || !guest) return;
    const iv = setInterval(() => {
      getConversation(convId, guest)
        .then((d) => {
          setMessages(d.messages || []);
          if (!openRef.current) {
            setUnread(d.messages.filter((m: ChatMsg) => m.sender === 'admin' && !m.read).length);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [wsDown, convId, guest]);

  async function startConversation() {
    setStarting(true);
    try {
      const d = await createConversation({
        visitorName: name.trim() || undefined,
        contactType,
        contact: contact.trim() || undefined,
        locale,
      });
      setConvId(d.id);
      setGuest(d.guestToken);
      localStorage.setItem(LS_ID, d.id);
      localStorage.setItem(LS_GUEST, d.guestToken);
      setMessages([]);
      setupSocket(d.id, d.guestToken);
    } catch {
      alert('创建会话失败，请稍后再试');
    } finally {
      setStarting(false);
    }
  }

  async function send(text: string | null, imageUrl: string | null) {
    if (!convId || !guest) return;
    const clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const temp: ChatMsg = {
      id: 'temp-' + clientId,
      sender: 'visitor',
      content: text,
      imageUrl,
      read: false,
      createdAt: new Date().toISOString(),
      clientId,
    };
    setMessages((prev) => [...prev, temp]);
    scrollBottom();
    if (!socketRef.current?.sendMessage(text, imageUrl, clientId)) {
      try {
        const d = await sendMessageRest({ conversationId: convId, content: text || undefined, imageUrl: imageUrl || undefined, guest });
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
    send(v, null);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!convId || !guest) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, guest);
      await send(null, url);
    } catch {
      alert('图片上传失败');
    } finally {
      setUploading(false);
    }
  }

  // 后台管理页不渲染站内客服入口
  if (isAdmin) return null;

  return (
    <>
      {/* 悬浮入口按钮 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t.imTitle}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-ink pl-4 pr-5 py-3 shadow-card hover:opacity-90 active:scale-95 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
              fill="#fff"
            />
          </svg>
          <span className="text-sm font-medium text-white">{t.imTitle}</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {/* 聊天面板 */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,360px)] h-[min(78vh,560px)] bg-surface border border-line shadow-2xl flex flex-col rounded-xl overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-ink text-white">
            <div className="text-sm font-medium">{t.imTitle}</div>
            <div className="flex items-center gap-2">
              {conn !== 'open' && (
                <span className="text-[10px] text-amber-300">{t.imConnLost}</span>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="close"
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>
          </div>

          {!convId ? (
            /* 开始咨询表单 */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-sm font-medium">{t.imStartTitle}</p>
              <p className="text-xs text-muted">{t.imLeaveContact}</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.imNamePh}
                className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <div>
                <label className="text-xs text-muted">{t.imContactType}</label>
                <div className="flex gap-2 mt-1">
                  {(['none', 'email', 'phone'] as const).map((ct) => (
                    <button
                      key={ct}
                      onClick={() => setContactType(ct)}
                      className={`px-2.5 py-1.5 text-xs border ${
                        contactType === ct ? 'border-ink bg-ink text-white' : 'border-line'
                      }`}
                    >
                      {ct === 'none' ? t.imContactNone : ct === 'email' ? t.imContactEmail : t.imContactPhone}
                    </button>
                  ))}
                </div>
              </div>
              {contactType !== 'none' && (
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t.imContactPh}
                  className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              )}
              <button
                onClick={startConversation}
                disabled={starting}
                className="w-full btn-gold py-2.5 text-sm disabled:opacity-60"
              >
                {starting ? '…' : t.imStart}
              </button>
            </div>
          ) : (
            <>
              {/* 消息区 */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-bg">
                {messages.length === 0 && (
                  <p className="text-xs text-muted text-center mt-6">{t.imStartTitle}</p>
                )}
                {messages.map((m) => {
                  const mine = m.sender === 'visitor';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? 'bg-ink text-white rounded-br-sm' : 'bg-line/30 text-ink rounded-bl-sm'
                        }`}
                      >
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.imageUrl}
                            alt=""
                            className="max-w-full rounded-lg max-h-48 object-cover"
                          />
                        ) : (
                          <span className="whitespace-pre-wrap break-words">{m.content}</span>
                        )}
                        <div className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-muted'}`}>
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* 输入区 */}
              <div className="border-t border-line p-2 flex items-end gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label={t.imAttach}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-line hover:border-ink"
                >
                  {uploading ? '…' : '📷'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
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
                  placeholder={t.imInputPh}
                  className="flex-1 resize-none border border-line px-3 py-2 text-sm outline-none focus:border-ink max-h-24"
                />
                <button onClick={onSend} className="shrink-0 btn-gold px-4 py-2 text-sm">
                  {t.imSend}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
