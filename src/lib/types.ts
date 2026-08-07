// 统一商品视图类型 —— mock 与数据库查询结果共用，方便后续全面切到 DB
export type Badge = 'new' | 'sale' | 'overseas';
export type Gender = 'men' | 'women' | 'unisex';

export type Product = {
  slug: string;
  name: string;
  brandCode: string; // 货号 / style code（如 GF410）
  price: number; // 韩元 ₩
  compareAtPrice?: number;
  badges?: Badge[];
  gender?: Gender;
  category?: string; // 分类 slug
  color?: string;
  image?: string;
};

export type ProductSku = {
  id: string;
  skuCode: string;
  options: Record<string, string> | null;
  price?: number;
  stock: number;
};

export type ReviewView = {
  id: string;
  rating: number;
  title?: string | null;
  content?: string | null;
  author: string;
  createdAt: Date;
};

export type ProductDetail = Product & {
  description: string;
  brand: string;
  images: string[];
  skus: ProductSku[];
  reviews: ReviewView[];
};
