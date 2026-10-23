import type { Metadata } from 'next';
import Link from 'next/link';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { SectionHeading } from '@/components/home/section-heading';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

  // 后台「页面内容 → 活动页面」维护的内容；没有数据时回落到默认文案
  let events: {
    id: string;
    title: string;
    titleZh: string | null;
    subtitle: string | null;
    subtitleZh: string | null;
    badge: string | null;
    imageUrl: string | null;
    href: string | null;
  }[] = [];
  try {
    events = await prisma.eventItem.findMany({
      where: { status: 'published' },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        titleZh: true,
        subtitle: true,
        subtitleZh: true,
        badge: true,
        imageUrl: true,
        href: true,
      },
    });
  } catch {
    // 数据库不可用时回落默认文案，页面不能 500
  }

  const titleOf = (e: { title: string; titleZh: string | null }) =>
    loc === 'zh' ? e.titleZh || e.title : e.title;
  const subOf = (e: { subtitle: string | null; subtitleZh: string | null }) =>
    loc === 'zh' ? e.subtitleZh || e.subtitle : e.subtitle;

  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-12">
      <SectionHeading title={dict.nav.events} center />

      {events.length === 0 ? (
        <div className="bg-sand border border-line rounded-card p-10 text-center">
          <p className="tracking-luxe text-xs text-accent-strong mb-4">{dict.events.liveBadge}</p>
          <h2 className="font-display text-3xl sm:text-5xl text-ink">{dict.events.liveHeading}</h2>
          <p className="mt-4 text-ink-soft max-w-md mx-auto">{dict.events.liveBody}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((e) => {
            const inner = (
              <>
                {e.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageUrl}
                    alt=""
                    className="w-full h-56 object-cover rounded-t-card"
                  />
                )}
                <div className="p-8 text-center">
                  {e.badge && (
                    <p className="tracking-luxe text-xs text-accent mb-3">{e.badge}</p>
                  )}
                  <h2 className="font-display text-2xl sm:text-4xl text-ink">
                    {titleOf(e)}
                  </h2>
                  {subOf(e) && (
                    <p className="mt-3 text-muted max-w-md mx-auto">{subOf(e)}</p>
                  )}
                </div>
              </>
            );
            const cls =
              'block border border-line bg-surface rounded-card overflow-hidden hover:border-accent transition-colors';
            return e.href ? (
              <Link key={e.id} href={e.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={e.id} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
