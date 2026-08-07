// Root layout is a passthrough; the <html>/<body> tags live in
// src/app/[locale]/layout.tsx so each locale can set the correct lang attribute.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
