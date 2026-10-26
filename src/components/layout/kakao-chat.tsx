import { getKakaoUrl } from '@/lib/kakao';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';

/**
 * KakaoTalk 聊天客服悬浮入口（全站可见，右下角固定）。
 *
 * - 链接读后台「SEO 设置 → Kakao 咨询链接」；未配置时**整块不渲染**，
 *   不退回到任何默认链接（与商品页「Kakao 咨询购买」按钮同源同规则）。
 * - Server Component：直接 await 读库，客户端零 JS。
 */
export async function KakaoChat({ locale }: { locale: Locale }) {
  const url = await getKakaoUrl();
  if (!url) return null;
  const dict = getDictionary(locale);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={dict.nav.chatSupport}
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
        {dict.nav.chatSupport}
      </span>
    </a>
  );
}
