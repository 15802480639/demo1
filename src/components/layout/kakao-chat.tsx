import { getKakaoUrl } from '@/lib/kakao';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { KakaoChatButton } from './kakao-chat-button';

/**
 * KakaoTalk 聊天客服悬浮入口。
 *
 * - 链接读后台「SEO 设置 → Kakao 咨询链接」；未配置时**整块不渲染**。
 * - 后台管理页（/{locale}/admin/**）不显示（由 KakaoChatButton 客户端判断）。
 * - Server Component 负责读库取链接与文案，按钮壳（客户端）负责路由判断与渲染。
 */
export async function KakaoChat({ locale }: { locale: Locale }) {
  const url = await getKakaoUrl();
  if (!url) return null;
  const dict = getDictionary(locale);
  return <KakaoChatButton url={url} label={dict.nav.chatSupport} />;
}
