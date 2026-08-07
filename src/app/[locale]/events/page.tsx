import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { SectionHeading } from '@/components/home/section-heading';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  return { title: getDictionary(loc).nav.events, alternates: { canonical: `/${loc}/events` } };
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = (isLocale(locale) ? locale : 'ko') as Locale;
  const dict = getDictionary(loc);

  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-12">
      <SectionHeading title={dict.nav.events} center />
      <div className="bg-ink text-white rounded-card p-10 text-center">
        <p className="tracking-luxe text-xs text-accent mb-4">LIVE</p>
        <h2 className="font-display text-3xl sm:text-5xl">
          매일 저녁 8시 유튜브 라이브
        </h2>
        <p className="mt-4 text-white/70 max-w-md mx-auto">
          {dict.home.announcement}
        </p>
      </div>
    </div>
  );
}
