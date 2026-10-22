import Link from 'next/link';
import { headers } from 'next/headers';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteConfig } from '@/lib/site';

/**
 * 根级 404 —— 覆盖没有 locale 前缀的路径（如 /products/xxx 直接访问）。
 *
 * 记忆库 §8 头号遗留项「软 404」：
 *  任意路径都返回 200 时，Google 会判定整站低质量，
 *  且站长工具「网址检查」的 HTML 标记验证必然失败。
 * 这里给出真实 404 状态 + 正确入口，避免用户和爬虫都撞进死胡同。
 *
 * ⚠️ 2026-10-19：实测 `/ko/不存在的路径` 也会落到根级 404（app router
 * 未匹配路径直接找最近的祖先 not-found），所以这里也要按 locale 出文案，
 * 不能恒显英文。同样禁止 import seo.ts（会把 prisma 拖进服务端依赖倒没事，
 * 但保持零依赖更稳），JSON-LD 内联手写。
 */
async function detectLocale(): Promise<Locale> {
  try {
    const h = await headers();
    // proxy.ts 注入的 x-ws-locale 最可靠；next-url/referer 兜底
    const injected = h.get('x-ws-locale');
    if (injected && isLocale(injected)) return injected;
    const nextUrl = h.get('next-url') || h.get('referer') || '';
    const seg = nextUrl.split('/').filter(Boolean)[0];
    if (isLocale(seg)) return seg;
  } catch {
    // headers() 不可用时静默回落
  }
  return locales[0] as Locale;
}

export default async function RootNotFound() {
  const loc = await detectLocale();
  const dict = getDictionary(loc);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl text-center py-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: dict.common.notFound,
              url: `${siteConfig.url.replace(/\/$/, '')}/404`,
            }),
          }}
        />
        <p className="text-xs tracking-[0.3em] text-muted mb-4">404</p>
        <h1 className="font-display text-4xl text-ink mb-4">
          {siteConfig.name}
        </h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          {dict.common.pageNotFound} {dict.common.pageNotFoundDesc}
        </p>
        <div className="flex flex-wrap gap-3 justify-center text-sm">
          <Link href={`/${loc}`} className="btn-gold">
            {dict.nav.home}
          </Link>
          <Link href={`/${loc}/products`} className="btn-outline">
            {dict.nav.shop}
          </Link>
          <Link href={`/${loc}/faq`} className="btn-outline">
            {dict.faq.heading}
          </Link>
        </div>
      </div>
    </div>
  );
}
