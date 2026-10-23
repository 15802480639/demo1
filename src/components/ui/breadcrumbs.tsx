import Link from 'next/link';

/**
 * 可见面包屑。
 * 既给访客看，也给 AI 抓页面层级（GEO：让模型一眼看懂内容归属）。
 */
export interface Crumb {
  name: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  className = '',
}: {
  items: Crumb[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="breadcrumb"
      className={`text-xs text-muted ${className}`}
    >
      {items.map((it, i) => (
        <span key={`${it.name}-${i}`} className="inline-flex items-center">
          {i > 0 && <span className="mx-2">/</span>}
          {it.href && i < items.length - 1 ? (
            <Link href={it.href} className="hover:text-accent">
              {it.name}
            </Link>
          ) : (
            <span className="text-ink">{it.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
