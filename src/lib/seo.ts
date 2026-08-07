import { siteConfig } from "@/lib/site";

// 结构化数据（JSON-LD）生成器，供各页面注入，利于 Google 富媒体收录
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.png`,
    sameAs: [], // TODO: 补充社交主页
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function productJsonLd(p: {
  name: string;
  description?: string;
  image: string[];
  price: number;
  currency?: string;
  sku?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: p.currency ?? "USD",
      url: p.url,
      availability: "https://schema.org/InStock",
    },
  };
}

export function itemListJsonLd(
  items: { name: string; url: string; image?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
      image: it.image,
    })),
  };
}
