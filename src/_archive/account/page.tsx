import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">My Account</h1>
      {/* TODO: 登录态 / 订单入口 / 地址管理 / 收藏 */}
      <p className="text-zinc-500">Account dashboard coming soon.</p>
    </div>
  );
}
