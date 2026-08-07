import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse all product categories.",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Categories</h1>
      {/* TODO: 从 Prisma 读取分类树 */}
      <p className="text-zinc-500">Category grid coming soon.</p>
    </div>
  );
}
