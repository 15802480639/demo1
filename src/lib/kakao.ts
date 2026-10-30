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

/**
 * 右下角 Kakao 悬浮球是否显示（后台开关，2026-10-30 新增）。
 *
 * ⚠️ 为什么需要这个开关？
 *   站内实时客服 IM 上线后，右下角同时存在两个客服入口：
 *     · 黑色「실시간 고객 서비스」→ 站内 IM（ChatWidget，z-50）
 *     · 黄色「채팅 상담」→ 外部 Kakao（KakaoChatButton，z-40）
 *   两者定位完全重合（都是 fixed bottom-5 right-5），黄色被黑色压住只露出一角，
 *   看起来像「按钮渲染坏了」。
 *
 *   子建拍板：**前台只留黑色实时客服**。
 *   但 Kakao 入口本身有业务价值（韩国用户的既有咨询通道），
 *   所以做成后台可开关 —— 以后想放回来，在后台勾一下即可，不用改代码重新部署。
 *
 * ⚠️ 这个开关**只管右下角悬浮球**，跟商品页的「Kakao 상담」主按钮无关
 *   （那个由 getKakaoUrl() 独立驱动，见 add-to-cart.tsx）。
 *
 * 键名双读：点号（库里存量风格）`kakao.fabEnabled` / 下划线（新后台写入）`kakao_fab_enabled`。
 * 默认**关闭** —— 没配置就等于不显示，绝不因为「读不到」就默认打开。
 */
export async function isKakaoFabEnabled(): Promise<boolean> {
  try {
    const s = await getSettings();
    const raw = s['kakao.fabEnabled'] ?? s.kakao_fab_enabled ?? '';
    const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  } catch {
    // 读库失败 → 保守隐藏（宁可不显示，也不要叠在一起）
    return false;
  }
}