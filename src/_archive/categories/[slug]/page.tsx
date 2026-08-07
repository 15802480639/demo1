import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold capitalize">{slug}</h1>
      {/* TODO: 该分类下商品列表（来自 Prisma） */}
      <p className="text-zinc-500">Products in this category coming soon.</p>
    </div>
  );
}
