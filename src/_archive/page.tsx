import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, itemListJsonLd } from "@/lib/seo";

// TODO: 从 Prisma 读取 featured 商品与分类
const featuredProducts = [
  { name: "Product A", slug: "product-a", price: 19.99, image: "" },
  { name: "Product B", slug: "product-b", price: 29.99, image: "" },
  { name: "Product C", slug: "product-c", price: 39.99, image: "" },
  { name: "Product D", slug: "product-d", price: 49.99, image: "" },
];

const categories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Home", slug: "home" },
  { name: "Fashion", slug: "fashion" },
  { name: "Beauty", slug: "beauty" },
];

export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={itemListJsonLd(
          featuredProducts.map((p) => ({
            name: p.name,
            url: `/products/${p.slug}`,
            image: p.image || undefined,
          }))
        )}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-zinc-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Quality Products, Worldwide Shipping
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-600">
            Discover curated products across categories. Fast delivery, secure
            checkout.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-semibold">Shop by Category</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="rounded-xl border p-6 text-center font-medium transition hover:bg-zinc-50"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-semibold">Featured Products</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {featuredProducts.map((p) => (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="group rounded-xl border p-4 transition hover:shadow-sm"
            >
              <div className="mb-3 aspect-square rounded-lg bg-zinc-100" />
              <h3 className="text-sm font-medium">{p.name}</h3>
              <p className="mt-1 text-sm text-zinc-600">${p.price}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
