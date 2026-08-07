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
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

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
  const title = `${siteConfig.name} — ${dict.home.seoHeading}`;
  const description = dict.home.seoBody;
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `/${l}`;
  languages['x-default'] = `/${defaultLocale}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s | ${siteConfig.name}` },
    description,
    alternates: {
      canonical: `/${loc}`,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title,
      description,
      url: `/${loc}`,
      locale: loc,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
      </head>
      <body>
        <JsonLd
          data={{
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url,
            logo: `${siteConfig.url}/logo.png`,
            sameAs: [siteConfig.youtube, siteConfig.instagram],
          }}
        />
        <AuthProvider user={session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null}>
          <LocaleProvider locale={loc} dict={dict}>
            <AnnouncementBar />
            <SiteHeader />
            <main className="min-h-screen">{children}</main>
            <SiteFooter />
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
