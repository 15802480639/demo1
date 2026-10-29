'use client';

import { useLocale } from '@/components/i18n/locale-provider';

/**
 * 商品页「咨询此商品」按钮 —— 把当前商品一键带进站内客服对话。
 *
 * 用自定义 DOM 事件而不是 URL 参数 / 全局 store 的原因：
 *   · chat-widget 是挂在 [locale]/layout 的全局浮窗，商品页是服务端组件，
 *     两者之间用事件通信最轻，零依赖、不污染 URL、不影响 SEO。
 *   · 事件名固定为 'chat:ask-product'，detail = { slug, name }
 */
export function AskAboutProduct({
  slug,
  name,
  className = '',
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const { dict } = useLocale();
  const t = dict.admin;

  function ask() {
    window.dispatchEvent(
      new CustomEvent('chat:ask-product', {
        detail: { slug, name },
      })
    );
  }

  return (
    <button
      type="button"
      onClick={ask}
      aria-label={t.imAskProduct}
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
      {t.imAskProduct}
    </button>
  );
}
