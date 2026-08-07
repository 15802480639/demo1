import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Wishlist</h1>
      <p className="text-zinc-500">Your wishlist is empty.</p>
    </div>
  );
}
