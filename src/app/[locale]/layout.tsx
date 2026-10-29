import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  locales,
  defaultLocale,
  isLocale,
  type Locale,
} from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteConfig } from '@/lib/site';
import '../app.css';
import { JsonLd } from '@/components/seo/json-ld';
import { LocaleProvider } from '@/components/i18n/locale-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { getSession } from '@/lib/auth';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { KakaoChat } from '@/components/layout/kakao-chat';
import { ChatWidget } from '@/components/chat/chat-widget';
import { SiteChrome } from '@/components/layout/site-chrome';
import {
  clampTitle,
  clampDesc,
  metaVerificationTags,
  siteMetaDefaults,
  siteOgImage,
  siteGaId,
} from '@/lib/seo';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : defaultLocale) as Locale;
  const dict = getDictionary(loc);

  // 🔴 后台「SEO 设置」填的值必须真正生效（之前 8 个字段前台零引用，站长验证永远做不了）
  const [defaults, verification, ogImage] = await Promise.all([
    siteMetaDefaults(),
    metaVerificationTags(),
    siteOgImage(),
  ]);

  const rawTitle = defaults.title || `${siteConfig.name} — ${dict.home.seoHeading}`;
  const title = clampTitle(rawTitle);
  const description = clampDesc(defaults.description || dict.home.seoBody);
  const base = siteConfig.url.replace(/\/$/, '');

  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${base}/${l}`;
  languages['x-default'] = `${base}/${defaultLocale}`;

  const ogImg = ogImage || `${base}/og-default.png`;

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${siteConfig.name}` },
    description,
    keywords: defaults.keywords.length > 0
      ? defaults.keywords
      : [
          'golfwear',
          'golf apparel',
          'golf jacket',
          'J&D',
          '제이앤디',
          '골프웨어',
          '高尔夫服饰',
        ],
    // 站长平台验证标签：后台填值即输出，无需重新 build
    verification: {
      google: verification['google-site-verification'],
      yahoo: undefined,
      yandex: undefined,
      me: verification['msvalidate.01'],
    },
    other: {
      ...verification,
    },
    alternates: {
      canonical: `${base}/${loc}`,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title,
      description,
      url: `${base}/${loc}`,
      locale: loc,
      images: [{ url: ogImg, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImg],
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const session = await getSession();

  // ⚠️ JsonLd 组件目前是同步渲染在 body 里的；这里改成在 head 里输出
  // Organization 必须异步读库（后台 sameAs / 公司信息），所以 layout 改为 async 动态
  const { organizationJsonLd, webSiteJsonLd } = await import('@/lib/seo');
  const [organization, gaId] = await Promise.all([organizationJsonLd(), siteGaId()]);

  return (
    <html lang={loc}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=swap"
          rel="stylesheet"
        />
        {/* Organization / WebSite 结构化数据放head：AI 引擎优先读 head 里的实体声明 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd(loc)) }}
        />
        {/* Google Analytics：后台 SEO 设置填 GA ID 即生效 */}
        {gaId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`,
              }}
            />
          </>
        )}
      </head>
      <body className="grain">
        <a href="#main" className="skip-link">
          {dict.common.skipToContent}
        </a>
        <AuthProvider
          user={
            session
              ? {
                  id: session.id,
                  username: session.username,
                  name: session.name,
                  email: session.email,
                  role: session.role,
                }
              : null
          }
        >
          <LocaleProvider locale={loc} dict={dict}>
            <SiteChrome>
              <SiteHeader />
            </SiteChrome>
            <main id="main" className="min-h-screen">{children}</main>
            {/* KakaoTalk 聊天客服悬浮入口：后台配置了咨询链接才显示 */}
            <KakaoChat locale={loc} />
            {/* 站内实时客服（IM）：游客可发起对话，后台 /{locale}/admin/chat 实时接待 */}
            <ChatWidget />
            <SiteChrome>
              <SiteFooter />
            </SiteChrome>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}