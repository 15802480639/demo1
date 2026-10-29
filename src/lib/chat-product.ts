import { siteConfig } from '@/lib/site';
import { locales, type Locale } from '@/i18n/config';

/**
 * 商品引用工具 —— 把"商品的链接"变成结构化的商品引用。
 *
 * 场景：
 *   1) 访客在聊天框粘贴商城链接（常从微信复制）→ 自动识别成商品引用
 *   2) 访客在商品页点「问客服」→ 带上当前商品的 slug
 *   3) 访客在商品页直接用聊天浮窗 → 输入框上方出现"当前商品"引用条
 *
 * ⚠️ 只存 slug，不存商品快照 —— 价格/库存由客服端实时查询，避免展示过期报价。
 * ⚠️ 生成链接一律走 src/lib/urls.ts 的 urlProduct()，禁止手拼。
 */

/** 商品 slug 规则：库里的真实 slug 形如 26padded-jacket-black（小写字母/数字/连字符） */
const SLUG = '[a-z0-9][a-z0-9_-]{1,80}';

/** 带语言段的商品路径：/{locale}/products/{slug} */
const RE_LOCALED = new RegExp(`/(ko|zh|en)/products/(${SLUG})`, 'i');
/** 不带语言段的商品路径：/products/{slug} */
const RE_LOOSE = new RegExp(`/products/(${SLUG})`, 'i');

export type ProductRef = {
  slug: string;
  /** 链接里带的语言；没带则为 null（由调用方按当前语言兜底） */
  locale: Locale | null;
};

/** 本站域名（含可能的历史域名），用于判断一个完整 URL 是不是本站的 */
function isOwnHost(host: string): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  const own = siteConfig.url
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .toLowerCase();
  if (h === own) return true;
  // 允许子域（www. 与裸域互认）
  const bare = own.replace(/^www\./, '');
  const hb = h.replace(/^www\./, '');
  return hb === bare || hb.endsWith('.' + bare);
}

/**
 * 从任意文本中解析商城商品链接 → 商品引用；解析不出返回 null。
 *
 * 严格策略：
 *   · 完整 URL（http/https）→ 域名必须是本站，否则不认（避免把淘宝链接当自家商品）
 *   · 相对路径（/ko/products/xxx）→ 直接认
 */
export function parseProductRef(text: string): ProductRef | null {
  if (!text || typeof text !== 'string') return null;
  const s = text.trim();
  if (!s) return null;

  // 1) 完整 URL：域名必须属于本站
  const urlRe = /https?:\/\/[^\s<>"'）)]+/gi;
  const urls = s.match(urlRe);
  if (urls) {
    for (const raw of urls) {
      let u: URL;
      try {
        u = new URL(raw);
      } catch {
        continue;
      }
      if (!isOwnHost(u.hostname)) continue;
      const m = u.pathname.match(RE_LOCALED) || u.pathname.match(RE_LOOSE);
      if (m) {
        const locale = m[1] ? (m[1].toLowerCase() as Locale) : null;
        const slug = (m[2] || m[1]).toLowerCase();
        return { slug, locale };
      }
    }
    // 有完整 URL 但都不是本站商品 → 不做相对路径兜底（避免误判）
    return null;
  }

  // 2) 相对路径
  const m = s.match(RE_LOCALED);
  if (m) {
    return { slug: m[2].toLowerCase(), locale: m[1].toLowerCase() as Locale };
  }
  const m2 = s.match(RE_LOOSE);
  if (m2) {
    return { slug: m2[1].toLowerCase(), locale: null };
  }
  return null;
}

/**
 * 从当前页面路径判断是否在商品详情页 → slug
 * 例：/zh/products/26padded-jacket-black → { slug: '26padded-jacket-black', locale: 'zh' }
 */
export function productRefFromPath(pathname: string): ProductRef | null {
  if (!pathname) return null;
  const m = pathname.match(RE_LOCALED);
  if (m) return { slug: m[2].toLowerCase(), locale: m[1].toLowerCase() as Locale };
  const m2 = pathname.match(RE_LOOSE);
  if (m2) return { slug: m2[1].toLowerCase(), locale: null };
  return null;
}

/** 供后台/客服侧使用：把 slug 归一成合法 slug（去掉路径分隔符与多余字符） */
export function normalizeSlug(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 81);
}

/** 语言合法性校验 */
export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (locales as readonly string[]).includes(v);
}
