import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-4 text-3xl font-semibold">Contact Us</h1>
      <p className="text-zinc-600">TODO: 联系表单 / 邮箱 / 社媒链接。</p>
    </div>
  );
}
