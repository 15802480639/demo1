import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteConfig } from '@/lib/site';
import { buildMetadata, faqJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getFaqs, getProductFaqs, DEFAULT_LLMS_INTRO } from '@/lib/geo';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  return buildMetadata({
    locale: loc,
    title: `${dict.faq.heading} — ${siteConfig.name}`,
    description: dict.faq.intro,
    path: '/faq',
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);
  const base = siteConfig.url.replace(/\/$/, '');

  // 全站 FAQ（该语种 + 全语种通用）+ 至少 3 条产品 FAQ
  const [globalFaqs, productFaqs] = await Promise.all([
    getFaqs(loc, { scope: 'global' }),
    getFaqs(loc, { scope: 'product', limit: 12 }),
  ]);

  // 产品 FAQ 在库里没挂时，用站点级通用问题兜底，保证 FAQPage schema 永不为空
  const faqs = [...globalFaqs, ...productFaqs];
  const structured = faqs.length > 0 ? faqs : [{ question: dict.faq.q1, answer: dict.faq.a1 }];

  const crumbs = breadcrumbJsonLd([
    { name: dict.nav.home, url: `${base}/${loc}` },
    { name: dict.faq.heading, url: `${base}/${loc}/faq` },
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <JsonLd data={faqJsonLd(structured) ?? {}} />
      <JsonLd data={crumbs} />

      <h1 className="font-display text-4xl text-ink mb-3">{dict.faq.heading}</h1>
      <p className="text-muted mb-10 leading-relaxed">{dict.faq.intro}</p>

      <div className="space-y-8">
        {structured.map((f, i) => (
          <section key={i} id={`faq-${i}`} className="border-b border-line pb-6 last:border-0">
            <h2 className="font-display text-lg text-ink mb-2">{f.question}</h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{f.answer}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 border border-line bg-surface p-6">
        <p className="text-sm text-muted leading-relaxed">
          {siteConfig.name}（{siteConfig.nameKo}）— {DEFAULT_LLMS_INTRO[loc].split('.')[0]}.
        </p>
      </div>
    </div>
  );
}