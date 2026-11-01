'use client';

import { useLocale } from '@/components/i18n/locale-provider';

/**
 * 订单详情页「就这单咨询客服」按钮 —— 把当前订单号带进站内客服对话。
 *
 * 与商品页 AskAboutProduct 同一套机制（自定义 DOM 事件）：
 *   事件名固定为 'chat:ask-order'，detail = { orderNo }
 * 聊天浮窗收到后：
 *   · 尚未建会话 → 建会话时把 orderNo 带上（服务端校验订单归属）
 *   · 已有会话 → 直接 PATCH 把订单挂到该会话上
 */
export function AskAboutOrder({
  orderNo,
  className = '',
}: {
  orderNo: string;
  className?: string;
}) {
  const { dict } = useLocale();
  const t = dict.admin;

  function ask() {
    window.dispatchEvent(
      new CustomEvent('chat:ask-order', {
        detail: { orderNo },
      })
    );
  }

  return (
    <button
      type="button"
      onClick={ask}
      aria-label={t.imAskOrder}
      className={`inline-flex items-center gap-2 text-sm border-b border-line hover:border-ink transition-colors ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {t.imAskOrder}
    </button>
  );
}
