import type { Dict } from '@/i18n/dictionaries';

/** 品牌服务承诺条 —— 首页轮播下方的信任背书区 */
export function ValueProps({ items }: { items: Dict['home']['valueProps'] }) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12 sm:py-14 grid sm:grid-cols-3 gap-8 sm:gap-10">
        {items.map((it, i) => (
          <div key={it.title} className="flex items-start gap-4 sm:gap-5">
            <span className="font-display text-2xl sm:text-3xl text-accent tabular-nums leading-none">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1">
              <h3 className="text-sm tracking-wide text-ink font-medium">
                {it.title}
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{it.desc}</p>
              <div className="mt-4 h-px w-full bg-line" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
