import { getSettings } from '@/lib/geo';

/**
 * Kakao 咨询链接 —— 商品页「Kakao 咨询购买」按钮的跳转目标。
 *
 * ⚠️ 严禁硬编码他人店铺链接。
 * 这个值不只是前端跳转目标，还会进 organizationJsonLd 的 sameAs。
 * sameAs 指向别家 = 主动告诉搜索引擎「我和他是同一个实体」，
 * 对 GEO / 实体识别是实打实的伤害（早期误填过参考站的 pf.kakao.com 链接）。
 *
 * 优先级：后台 SiteSetting(kakao.consultUrl) > 环境变量(KAKAO_CONSULT_URL) > 空串。
 * 返回空串表示「未配置」，调用方应据此隐藏 Kakao 入口，不要退回到任何默认链接。
 */
export async function getKakaoUrl(): Promise<string> {
  try {
    const s = await getSettings();
    const raw = s['kakao.consultUrl'] || s.kakao_consult_url || s.kakaoUrl || '';
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (/^https?:\/\//i.test(v)) return v;
  } catch {
    // 读库失败不阻塞页面渲染，退回环境变量
  }
  const env = (process.env.KAKAO_CONSULT_URL || '').trim();
  return /^https?:\/\//i.test(env) ? env : '';
}

/** 前缀判断：pf.kakao.com / open.kakao.com / chat.kakao.com 都算 Kakao 链接 */
export function isKakaoUrl(url: string): boolean {
  return /(^|\.)kakao\.com/i.test(url);
}