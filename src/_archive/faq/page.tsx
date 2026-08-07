import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-4 text-3xl font-semibold">FAQ</h1>
      <p className="text-zinc-600">TODO: 常见问题解答。</p>
    </div>
  );
}
