import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse all products across categories.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">All Products</h1>
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <h2 className="mb-3 text-sm font-semibold">Filters</h2>
          {/* TODO: 分类 / 价格区间 / 品牌 筛选 */}
          <p className="text-sm text-zinc-500">Filters coming soon</p>
        </aside>
        <section>
          {/* TODO: 从 Prisma 分页查询商品网格 */}
          <p className="text-zinc-500">Product grid coming soon.</p>
        </section>
      </div>
    </div>
  );
}
