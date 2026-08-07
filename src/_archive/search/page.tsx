import type { Metadata } from "next";

// 搜索结果页通常不希望被收录（避免参数重复页）
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Search</h1>
      <input
        type="search"
        placeholder="Search products..."
        className="w-full rounded-full border border-zinc-300 px-4 py-3 outline-none focus:border-black"
      />
      {/* TODO: 接入搜索（数据库模糊查询 / Algolia / Meilisearch） */}
      <p className="mt-6 text-zinc-500">Results coming soon.</p>
    </div>
  );
}
