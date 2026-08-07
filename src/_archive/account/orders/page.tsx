import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">My Orders</h1>
      {/* TODO: 从 Prisma 读取当前用户订单 */}
      <p className="text-zinc-500">No orders yet.</p>
    </div>
  );
}
