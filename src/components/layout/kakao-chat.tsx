import { getKakaoUrl, isKakaoFabEnabled } from '@/lib/kakao';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { KakaoChatButton } from './kakao-chat-button';

/**
 * KakaoTalk 聊天客服悬浮入口。
 *
 * - 链接读后台「SEO 设置 → Kakao 咨询链接」；未配置时**整块不渲染**。
 * - 后台管理页（/{locale}/admin/**）不显示（由 KakaoChatButton 客户端判断）。
 * - Server Component 负责读库取链接与文案，按钮壳（客户端）负责路由判断与渲染。
 *
 * ⚠️ 2026-10-30：右下角悬浮球默认**关闭**。
 *   站内实时客服 IM（黑色按钮）已上线，两者定位重合会叠在一起。
 *   子建拍板「前台只留黑色实时客服」，Kakao 入口改为后台开关控制
 *   （SEO 设置 → 勾选才显示）。详见 src/lib/kakao.ts 的 isKakaoFabEnabled()。
 */
export async function KakaoChat({ locale }: { locale: Locale }) {
  const url = await getKakaoUrl();
  if (!url) return null;

  // 后台开关未打开 → 不渲染悬浮球（避免与实时客服按钮重叠）
  if (!(await isKakaoFabEnabled())) return null;

  const dict = getDictionary(locale);
  return <KakaoChatButton url={url} label={dict.nav.chatSupport} />;
}
