import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Shopping Cart</h1>
      {/* TODO: 读取 Cart（DB 或 Cookie）渲染条目 + 结算按钮 */}
      <p className="text-zinc-500">Your cart is empty.</p>
      <Link
        href="/products"
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        Continue shopping
      </Link>
    </div>
  );
}
