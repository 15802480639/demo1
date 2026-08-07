'use client';

import Link from 'next/link';

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="flex items-center justify-center gap-2 mt-12" aria-label="pagination">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="w-10 h-10 flex items-center justify-center border border-line hover:border-ink transition-colors"
        >
          ‹
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`w-10 h-10 flex items-center justify-center border transition-colors ${
            p === page
              ? 'border-ink bg-ink text-white'
              : 'border-line hover:border-ink'
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="w-10 h-10 flex items-center justify-center border border-line hover:border-ink transition-colors"
        >
          ›
        </Link>
      )}
    </nav>
  );
}
