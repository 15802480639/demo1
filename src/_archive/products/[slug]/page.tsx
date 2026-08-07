import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { productJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

// TODO: 从 Prisma 读取商品；下方 metadata / JSON-LD 接入真实数据
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug,
    alternates: { canonical: `/products/${slug}` },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // const product = await prisma.product.findUnique({ where: { slug }, include: { skus: true } });
  // if (!product) notFound();

  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: slug,
          image: [],
          price: 0,
          url: `${siteConfig.url}/products/${slug}`,
        })}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-4 text-3xl font-semibold">{slug}</h1>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-xl bg-zinc-100" />
          <div>
            <p className="text-2xl font-semibold">$0.00</p>
            {/* TODO: SKU 规格选择 / 数量 / 加入购物车 / 收藏 */}
            <button className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-medium text-white">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
