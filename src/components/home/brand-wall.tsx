import { prisma } from '@/lib/prisma';
import { SectionHeading } from './section-heading';

export async function BrandWall({ title }: { title: string }) {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    take: 12,
    select: { name: true, slug: true },
  });
  return (
    <section className="bg-surface border-y border-line py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <SectionHeading title={title} center />
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-6">
          {brands.map((b) => (
            <span
              key={b.slug}
              className="font-display text-xl sm:text-2xl text-ink-soft hover:text-accent transition-colors cursor-default"
            >
              {b.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
