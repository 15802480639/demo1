import Link from "next/link";
import type { Metadata } from "next";

// 后台不收录
export const metadata: Metadata = {
  title: { default: "Admin", template: `%s | Admin` },
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-zinc-900 p-4 text-zinc-100">
        <div className="mb-6 text-lg font-bold">{`{Admin}`}</div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded px-3 py-2 text-sm transition hover:bg-zinc-800"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/"
            className="mt-4 block rounded px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800"
          >
            ← Back to store
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-zinc-50 p-8">{children}</main>
    </div>
  );
}
