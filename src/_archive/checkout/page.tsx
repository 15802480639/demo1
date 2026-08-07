import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Checkout</h1>
      {/* TODO: 地址表单 + 配送方式 + Stripe 支付集成 */}
      <p className="text-zinc-500">Checkout form coming soon.</p>
    </div>
  );
}
