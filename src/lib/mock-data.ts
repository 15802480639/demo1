export type Badge = 'new' | 'sale' | 'overseas';

export type Product = {
  slug: string;
  name: string;
  brandCode: string;
  price: number; // KRW
  badges?: Badge[];
  gender?: 'men' | 'women';
  category?: string;
  color?: string;
  image?: string;
};

// Demo catalog — replace with DB-backed data later.
export const products: Product[] = [
  { slug: '26summer-longsleeve-polo-men-white', name: '26 썸머 롱슬리브 폴로 - 화이트', brandCode: 'GF410', price: 999999, badges: ['new', 'overseas'], gender: 'men', category: 'tshirts' },
  { slug: '26summer-longsleeve-polo-men-black', name: '26 썸머 롱슬리브 폴로 - 블랙', brandCode: 'GF410', price: 999999, badges: ['new'], gender: 'men', category: 'tshirts' },
  { slug: '30-gradation-collar-short-blue', name: '30 그라데이션 패턴 카라 반팔 - 블루', brandCode: 'LC2621', price: 777777, badges: ['new'], gender: 'men', category: 'tshirts' },
  { slug: '30-new-logo-collar-beige', name: '30 뉴 로고 포인트 카라 반팔 - 베이지', brandCode: 'LC2620', price: 777777, gender: 'men', category: 'tshirts' },
  { slug: '30-tech-jersey-polo-navy', name: '30 테크 저지 폴로 - 네이비', brandCode: 'LC2637', price: 777777, badges: ['sale'], gender: 'men', category: 'tshirts' },
  { slug: '30-crochet-polo-sweater-navy', name: '30 크로셰 폴로 스웨터 - 네이비', brandCode: 'LC2629', price: 777777, gender: 'men', category: 'sweater' },
  { slug: '30-basic-pq-collar-blue', name: '30 베이직 PQ 카라 티셔츠 - 블루', brandCode: 'LC2638', price: 777777, gender: 'men', category: 'tshirts' },
  { slug: 'women-crop-knit-vest-ivory', name: '여성 크롭 니트 베스트 - 아이보리', brandCode: 'MN110', price: 129000, badges: ['new'], gender: 'women', category: 'vest' },
  { slug: 'women-wide-pants-beige', name: '여성 와이드 팬츠 - 베이지', brandCode: 'MN220', price: 159000, gender: 'women', category: 'pants' },
  { slug: 'golf-cap-logo-black', name: '골프 모자 로고 캡 - 블랙', brandCode: 'ACC01', price: 49000, badges: ['overseas'], category: 'acc', gender: 'men' },
  { slug: 'round-sunglasses-gold', name: '라운드 선글라스 - 골드', brandCode: 'ACC02', price: 89000, badges: ['sale'], category: 'acc' },
  { slug: 'golf-tote-bag-tan', name: '골프 토트백 - 탠', brandCode: 'ACC03', price: 219000, category: 'acc' },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export const brands = [
  'TITLEIST', 'PXG', 'GFORE', 'AMAZINGCRE', 'PEARLY GATES', 'ANEW',
  'ICEBERG', 'LANVIN BLANC', 'MALBON', 'MARK & LONA', 'J.LINDEBERG',
  'NIKE', 'CP COMPANY', 'WOOYOUNGMI', 'A.P.C', 'SOUTHCAPE',
];
