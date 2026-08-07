'use client';

import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';
import { siteConfig } from '@/lib/site';

export function SiteFooter() {
  const { locale, dict } = useLocale();
  const f = dict.footer;
  const year = new Date().getFullYear();

  const columns = [
    {
      title: f.about,
      links: [
        { label: dict.nav.brands, href: `/${locale}/brands` },
        { label: dict.nav.newArrivals, href: `/${locale}/products?new=1` },
        { label: dict.nav.events, href: `/${locale}/events` },
      ],
    },
    {
      title: f.help,
      links: [
        { label: f.shipping, href: `/${locale}/info/shipping` },
        { label: f.returns, href: `/${locale}/info/returns` },
        { label: f.faq, href: `/${locale}/info/faq` },
        { label: f.contact, href: `/${locale}/info/contact` },
      ],
    },
    {
      title: f.policy,
      links: [
        { label: f.privacy, href: `/${locale}/info/privacy` },
        { label: f.terms, href: `/${locale}/info/terms` },
      ],
    },
  ];

  return (
    <footer className="bg-ink text-accent-pale mt-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* brand block */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-3xl text-white mb-4">
              {siteConfig.name}
            </div>
            <p className="text-sm leading-relaxed opacity-70 max-w-xs">
              {dict.home.seoBody}
            </p>
            <div className="flex gap-4 mt-6">
              <a href={siteConfig.youtube} className="text-white/80 hover:text-accent transition-colors text-sm">
                YouTube
              </a>
              <a href={siteConfig.instagram} className="text-white/80 hover:text-accent transition-colors text-sm">
                Instagram
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white text-sm tracking-wide mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="luxe-rule my-10 bg-white/10" />

        <div className="flex flex-col sm:flex-row justify-between gap-4 text-xs opacity-60">
          <p>
            {f.copyright} {year} {siteConfig.company.name} — {dict.common.allRights}
          </p>
          <p>
            {siteConfig.company.email} · {siteConfig.company.tel}
          </p>
        </div>
      </div>
    </footer>
  );
}
