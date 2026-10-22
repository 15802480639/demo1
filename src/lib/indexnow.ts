/**
 * IndexNow —— 微软/Bing/Yandex 的即时收录通道。
 *
 * 为什么重要（记忆库 §3.5）：传统 sitemap 提交要等几天到几周才能被重新抓取，
 * IndexNow 推送后 Bing 系（**ChatGPT 联网检索主要走 Bing 索引**）几分钟内就会重抓。
 * 这是目前「上线一个新商品页 → 让 AI 尽快看到」最快的通道。
 *
 * 三条铁律：
 *  1. **失败静默**：任何网络异常、限流、非2xx 一律吞掉，绝不影响主业务流程
 *  2. **500 条/批**：官方硬限制，超了直接拒收
 *  3. **密钥必须公网可读**：public/{key}.txt 内容就是 key 本身
 */

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_BATCH = 500;
const TIMEOUT_MS = 10_000;

/**
 * 读取密钥：环境变量 INDEXNOW_KEY 优先，其次后台「SEO 设置」里保存的值。
 * 库里历史键名为 `indexnow.key`，新后台页写入 `indexnow_key`，两套都读。
 *
 * ⚠️ 本函数是 async：读库查设置不能同步做。所有调用方都已是 async，无需改签名。
 */
export async function getIndexNowKey(): Promise<string> {
  const raw = process.env.INDEXNOW_KEY ?? '';
  if (isValidKey(raw)) return raw.trim();

  try {
    const { getSettings } = await import('@/lib/geo');
    const s = await getSettings();
    for (const k of ['indexnow_key', 'indexnow.key']) {
      const v = s[k];
      if (typeof v === 'string' && isValidKey(v)) return v.trim();
    }
  } catch {
    // 读库失败不阻断，退化为「未配置」
  }
  return '';
}

function isValidKey(raw: string | undefined | null): boolean {
  if (typeof raw !== 'string') return false;
  const k = raw.trim();
  // 官方要求：8~128 位字母/数字/连字符
  return k.length >= 8 && k.length <= 128 && /^[a-zA-Z0-9-]+$/.test(k);
}

/** host 必须与站点域名一致，否则 IndexNow 校验失败 */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** 同步快速判断：只看环境变量（不查库），用于免鉴权的自检接口 */
export function isIndexNowConfiguredEnv(): boolean {
  return isValidKey(process.env.INDEXNOW_KEY);
}

/**
 * 推送一批 URL。
 * @returns 推送结果摘要，永远不抛异常
 */
export async function submitUrls(
  urls: string[],
  key?: string
): Promise<{ enabled: boolean; submitted: number; ok: boolean; status?: number; error?: string }> {
  const k = key ?? (await getIndexNowKey());
  if (!k || !isValidKey(k)) {
    return { enabled: false, submitted: 0, ok: false, error: 'IndexNow key not configured' };
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    return { enabled: false, submitted: 0, ok: false, error: 'NEXT_PUBLIC_SITE_URL not set' };
  }

  const host = hostOf(process.env.NEXT_PUBLIC_SITE_URL);
  // 只推本站 URL，且 host 必须一致
  const clean = Array.from(new Set(urls.filter((u) => /^https?:\/\//i.test(u) && hostOf(u) === host)));
  if (clean.length === 0) {
    return { enabled: true, submitted: 0, ok: false, error: 'no valid same-host URL' };
  }

  const batch = clean.slice(0, MAX_BATCH);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: k, keyLocation: `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/${k}.txt`, urlList: batch }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    // 200 = 全部接受；202 = 部分入队；400 段 = 密钥/格式问题
    return {
      enabled: true,
      submitted: batch.length,
      ok: res.status === 200 || res.status === 202,
      status: res.status,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    // 静默：只记录不抛出
    return {
      enabled: true,
      submitted: batch.length,
      ok: false,
      error: e instanceof Error ? e.message : 'network error',
    };
  }
}

/**
 * 把一组路径转成三语种完整 URL 并推送。
 * 例：pushPaths(['/products/xxx']) → 自动推 ko/zh/en 三个地址。
 */
export async function pushPaths(paths: string[], key?: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const locs = ['ko', 'zh', 'en'];
  const urls: string[] = [];
  for (const p of paths) {
    const clean = p.startsWith('/') ? p : `/${p}`;
    for (const l of locs) {
      urls.push(`${base}/${l}${clean === '/' ? '' : clean}`);
    }
  }
  return submitUrls(urls, key);
}

/** 后台一键推送：全站 URL（首页+ 列表 + FAQ + 全部产品 + 分类） */
export async function pushAllSiteUrls(key?: string) {
  const { prisma } = await import('@/lib/prisma');
  const [slugs, cats] = await Promise.all([
    prisma.product.findMany({ where: { status: 'active' }, select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const paths = [
    '/',
    '/products',
    '/faq',
    '/brands',
    '/events',
    '/info/shipping',
    '/info/returns',
    '/info/contact',
    ...slugs.map((s) => `/products/${s.slug}`),
  ];

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const locs = ['ko', 'zh', 'en'];
  const urls: string[] = [];
  for (const p of paths) {
    for (const l of locs) urls.push(`${base}/${l}${p === '/' ? '' : p}`);
  }
  // 分类页是 query URL，单独补
  for (const c of cats) {
    for (const l of locs) urls.push(`${base}/${l}/products?cat=${c.slug}`);
  }

  const res = await submitUrls(urls, key);
  return { ...res, totalCollected: urls.length };
}