'use client';

import { usePathname } from 'next/navigation';

/**
 * KakaoTalk 客服按钮的客户端壳：
 * - 后台管理页（/{locale}/admin/**）一律不显示；
 * - 其余页面渲染为右下角固定悬浮按钮。
 */
export function KakaoChatButton({ url, label }: { url: string; label: string }) {
  const pathname = usePathname() || '';
  // 匹配 /{locale}/admin 及其所有子路径
  if (/^\/[a-z-]+\/admin(\/|$)/.test(pathname)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 flex items-center gap-2.5 rounded-full bg-[#FEE500] pl-3.5 pr-4 py-3 shadow-card hover:brightness-95 active:scale-95 transition"
    >
      {/* Kakao 聊天气泡（简约拟态，非官方 path） */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3c-5 0-9 3.3-9 7.4 0 2.7 1.7 5.1 4.3 6.5-.2.8-.7 2.3-1.4 3.3 1.6-.3 3.6-1.5 4.6-2.4.5.1 1 .1 1.5.1 5 0 9-3.3 9-7.4S17 3 12 3z"
          fill="#191600"
        />
        <circle cx="8.9" cy="10.3" r="1.05" fill="#FEE500" />
        <circle cx="15.1" cy="10.3" r="1.05" fill="#FEE500" />
      </svg>
      <span className="text-sm font-medium tracking-wide text-[#191600]">
        {label}
      </span>
    </a>
  );
}
