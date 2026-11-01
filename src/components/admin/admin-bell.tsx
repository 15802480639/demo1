'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { useLocale } from '@/components/i18n/locale-provider';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
};

/**
 * 后台通知铃铛 —— 新订单 / 新客服消息提醒。
 *
 * 为什么轮询而不是 WebSocket：
 *   站内客服已经有 WS 通道，但它是为「会话消息」设计的，
 *   而订单通知的接收方是任意一个后台管理员（可能没打开客服页）。
 *   这里用 30 秒轮询 + 未读数徽标，实现简单可靠；
 *   通知数据本身落在 AdminNotification 表（按人记已读）。
 *
 * 未读数按各自管理员计算（A 看了不等于 B 看了）。
 */
export function AdminBell({ locale }: { locale: Locale }) {
  const { dict } = useLocale();
  const t = dict.admin;
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      setItems(d.notifications ?? []);
      setUnread(d.unreadCount ?? 0);
    } catch {
      /* 静默：通知失败不影响后台使用 */
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markAllRead() {
    if (unread === 0) return;
    // 先本地清零，避免等待网络导致徽标闪烁
    setUnread(0);
    setItems((prev) => prev.slice(0, 0));
    try {
      await fetch('/api/admin/notifications', { method: 'POST' });
    } catch {
      /* noop */
    }
    load();
  }

  const L = {
    ko: { bell: '알림', empty: '새 알림이 없습니다', markAll: '모두 읽음', orders: '주문', chat: '상담' },
    zh: { bell: '通知', empty: '暂无新通知', markAll: '全部已读', orders: '订单', chat: '咨询' },
    en: { bell: 'Notifications', empty: 'No new notifications', markAll: 'Mark all read', orders: 'Order', chat: 'Chat' },
  }[locale === 'zh' ? 'zh' : locale === 'en' ? 'en' : 'ko'];

  return (
    <div className="relative mr-2" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative px-2.5 py-1.5 border border-line hover:border-ink transition-colors text-sm"
        aria-label={L.bell}
        title={L.bell}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 max-h-[70vh] overflow-y-auto border border-line bg-surface shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line sticky top-0 bg-surface">
            <span className="text-xs tracking-widest">{L.bell}</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-accent hover:underline"
              >
                {L.markAll}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-xs text-muted">{L.empty}</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className="border-b border-line last:border-0">
                  <Link
                    href={n.link ? `/${locale}${n.link.replace(/^\/(ko|zh|en)/, '')}` : `/${locale}/admin`}
                    onClick={() => {
                      setOpen(false);
                      markAllRead();
                    }}
                    className="block px-3 py-2.5 hover:bg-line/20"
                  >
                    <p className="text-xs flex items-center gap-2">
                      <span className="px-1.5 py-0.5 border border-line text-[9px] text-muted">
                        {n.type === 'order' ? L.orders : L.chat}
                      </span>
                      <span className="truncate">{n.title}</span>
                    </p>
                    {n.body && <p className="text-[11px] text-muted mt-1 truncate">{n.body}</p>}
                    <p className="text-[10px] text-muted mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
