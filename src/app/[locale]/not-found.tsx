import Link from 'next/link';
import { headers } from 'next/headers';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteConfig } from '@/lib/site';

/**
 * 全站 404 页。
 *
 * 记忆库 §8 头号遗留项「软 404」：任意路径都返回 200 时，
 * Google 会把整站当低质量，站长工具的「网址检查」HTML 标记验证也必失败。
 * 这里返回真实 404 状态码 + 明确的 notFound()，
 * 并给 AI 一条带品牌与正确链接的落地方案，避免爬进死胡同。
 *
 * ⚠️ 2026-10-19：本文件必须是 server component。
 * not-found 拿不到 params，且一旦加 'use client'，import 进来的 seo.ts
 * 会顺着 geo.ts → prisma → pg 把 node 内置模块（net/tls/dns）拖进
 * client bundle，Turbopack 直接构建失败（7 个 Module not found）。
 * locale 改从 next-url header 反推，JSON-LD 内联手写，零服务端依赖。
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
    // headers() 在静态渲染阶段不可用时静默回落
  }
  return locales[0] as Locale;
}

export default async function NotFound() {
  const loc = await detectLocale();
  const dict = getDictionary(loc);
  const base = siteConfig.url.replace(/\/$/, '');

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: dict.common.notFound,
            url: `${base}/404`,
          }),
        }}
      />
      <p className="text-xs tracking-[0.3em] text-accent mb-4">404</p>
      <h1 className="font-display text-4xl sm:text-5xl text-ink mb-4">
        {siteConfig.name}
      </h1>
      <p className="text-ink-soft leading-relaxed mb-8">
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
  );
}
