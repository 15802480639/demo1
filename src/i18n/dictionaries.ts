import type { Locale } from './config';

export type Dict = {
  nav: {
    home: string;
    shop: string;
    women: string;
    men: string;
    accessories: string;
    brands: string;
    sale: string;
    events: string;
    domestic: string;
    newArrivals: string;
    login: string;
    register: string;
    cart: string;
    search: string;
    account: string;
    wishlist: string;
  };
  common: {
    addToCart: string;
    buyNow: string;
    viewDetail: string;
    loadMore: string;
    new: string;
    sale: string;
    freeShipping: string;
    overseasShipping: string;
    currency: string;
    language: string;
    search: string;
    subscribe: string;
    emailPlaceholder: string;
    allRights: string;
    backToTop: string;
    filter: string;
    sort: string;
    color: string;
    brand: string;
    feature: string;
    outOfStock: string;
    price: string;
    options: string;
    quantity: string;
  };
  home: {
    heroSlides: { eyebrow: string; title: string; subtitle: string; cta: string }[];
    announcement: string;
    newArrivals: string;
    newArrivalsSub: string;
    shopMen: string;
    shopWomen: string;
    brandsTitle: string;
    featuredTitle: string;
    featuredSub: string;
    subscribeTitle: string;
    subscribeSub: string;
    seoHeading: string;
    seoBody: string;
  };
  footer: {
    about: string;
    help: string;
    policy: string;
    follow: string;
    customerService: string;
    shipping: string;
    returns: string;
    faq: string;
    privacy: string;
    terms: string;
    contact: string;
    company: string;
    copyright: string;
  };
  product: {
    related: string;
    reviews: string;
    description: string;
    size: string;
    color: string;
    sku: string;
  };
};

const ko: Dict = {
  nav: {
    home: '홈',
    shop: '쇼핑',
    women: '여성',
    men: '남성',
    accessories: '악세서리',
    brands: '브랜드',
    sale: '세일',
    events: '이벤트',
    domestic: '국내배송',
    newArrivals: '신상품',
    login: '로그인',
    register: '회원가입',
    cart: '장바구니',
    search: '검색',
    account: '마이페이지',
    wishlist: '찜',
  },
  common: {
    addToCart: '장바구니 담기',
    buyNow: '바로구매',
    viewDetail: '자세히 보기',
    loadMore: '더 보기',
    new: 'NEW',
    sale: 'SALE',
    freeShipping: '무료배송',
    overseasShipping: '해외배송',
    currency: '통화',
    language: '언어',
    search: '검색',
    subscribe: '구독하기',
    emailPlaceholder: '이메일 주소를 입력하세요',
    allRights: 'All Rights Reserved',
    backToTop: '위로',
    filter: '필터',
    sort: '정렬',
    color: '색상',
    brand: '브랜드',
    feature: '상품특성',
    outOfStock: '품절',
    price: '가격',
    options: '옵션 선택',
    quantity: '수량',
  },
  home: {
    heroSlides: [
      {
        eyebrow: '2026 SS COLLECTION',
        title: '여름 클리어런스',
        subtitle: '연중 최대 할인',
        cta: '자세히 보기',
      },
      {
        eyebrow: 'NEW SEASON',
        title: '환절기 특가',
        subtitle: '프리미엄 골프웨어',
        cta: '쇼핑하러 가기',
      },
    ],
    announcement: '매일 저녁 8시 유튜브 라이브 — 신상품 최초 공개',
    newArrivals: '신상품',
    newArrivalsSub: '이번 시즌 가장 주목받는 아이템',
    shopMen: '남성 쇼핑',
    shopWomen: '여성 쇼핑',
    brandsTitle: '브랜드',
    featuredTitle: '추천 상품',
    featuredSub: '엠케이골프가 엄선한 베스트 셀렉션',
    subscribeTitle: '뉴스레터 구독',
    subscribeSub: '신상품과 단독 혜택을 가장 먼저 받아보세요',
    seoHeading: '프리미엄 골프웨어 쇼핑몰',
    seoBody:
      '엠케이골프는 남녀 골프웨어, 아우터, 니트, 모자, 가방 등 프리미엄 골프 패션을 합리적인 가격에 제공합니다. 국내외 배송 지원, 정품 보증, 빠른 배송으로 만족도 높은 쇼핑 경험을 약속합니다.',
  },
  footer: {
    about: '브랜드 소개',
    help: '고객센터',
    policy: '약관 및 정책',
    follow: '팔로우',
    customerService: '고객상담',
    shipping: '배송 안내',
    returns: '교환/반품',
    faq: '자주 묻는 질문',
    privacy: '개인정보처리방침',
    terms: '이용약관',
    contact: '문의하기',
    company: '회사 정보',
    copyright: 'Copyright MKGOLF — ',
  },
  product: {
    related: '관련 상품',
    reviews: '리뷰',
    description: '상품 설명',
    size: '사이즈',
    color: '색상',
    sku: '상품코드',
  },
};

const zh: Dict = {
  nav: {
    home: '首页',
    shop: '全部商品',
    women: '女装',
    men: '男装',
    accessories: '配件',
    brands: '品牌',
    sale: '特惠',
    events: '活动',
    domestic: '国内配送',
    newArrivals: '新品',
    login: '登录',
    register: '注册',
    cart: '购物车',
    search: '搜索',
    account: '我的账户',
    wishlist: '收藏',
  },
  common: {
    addToCart: '加入购物车',
    buyNow: '立即购买',
    viewDetail: '查看详情',
    loadMore: '加载更多',
    new: '新品',
    sale: '特惠',
    freeShipping: '免运费',
    overseasShipping: '海外配送',
    currency: '货币',
    language: '语言',
    search: '搜索',
    subscribe: '订阅',
    emailPlaceholder: '请输入您的邮箱',
    allRights: '保留所有权利',
    backToTop: '返回顶部',
    filter: '筛选',
    sort: '排序',
    color: '颜色',
    brand: '品牌',
    feature: '商品特性',
    outOfStock: '已售罄',
    price: '价格',
    options: '选择规格',
    quantity: '数量',
  },
  home: {
    heroSlides: [
      {
        eyebrow: '2026 春夏系列',
        title: '夏季清仓',
        subtitle: '年度最大折扣',
        cta: '查看详情',
      },
      {
        eyebrow: '新季上新',
        title: '换季特惠',
        subtitle: '高端高尔夫服饰',
        cta: '去逛逛',
      },
    ],
    announcement: '每晚 8 点 YouTube 直播 —— 新品首发',
    newArrivals: '新品上市',
    newArrivalsSub: '本季最受瞩目的单品',
    shopMen: '逛男装',
    shopWomen: '逛女装',
    brandsTitle: '品牌',
    featuredTitle: '精选推荐',
    featuredSub: 'MKGOLF 严选最佳系列',
    subscribeTitle: '订阅电子报',
    subscribeSub: '第一时间获取新品与专属优惠',
    seoHeading: '高端高尔夫服饰商城',
    seoBody:
      'MKGOLF 以合理的价格提供男女高尔夫服饰、外套、针织、帽子、包袋等高端高尔夫时尚。支持国内外配送、正品保证与快速发货，为您带来满意的购物体验。',
  },
  footer: {
    about: '关于品牌',
    help: '客户服务',
    policy: '条款与政策',
    follow: '关注我们',
    customerService: '客户咨询',
    shipping: '配送说明',
    returns: '退换货',
    faq: '常见问题',
    privacy: '隐私政策',
    terms: '服务条款',
    contact: '联系我们',
    company: '公司信息',
    copyright: '版权所有 MKGOLF — ',
  },
  product: {
    related: '相关商品',
    reviews: '评价',
    description: '商品描述',
    size: '尺码',
    color: '颜色',
    sku: '商品货号',
  },
};

const en: Dict = {
  nav: {
    home: 'Home',
    shop: 'Shop',
    women: 'Women',
    men: 'Men',
    accessories: 'Accessories',
    brands: 'Brands',
    sale: 'Sale',
    events: 'Events',
    domestic: 'Domestic Shipping',
    newArrivals: 'New Arrivals',
    login: 'Login',
    register: 'Sign Up',
    cart: 'Cart',
    search: 'Search',
    account: 'My Page',
    wishlist: 'Wishlist',
  },
  common: {
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    viewDetail: 'View Detail',
    loadMore: 'Load More',
    new: 'NEW',
    sale: 'SALE',
    freeShipping: 'Free Shipping',
    overseasShipping: 'Overseas Shipping',
    currency: 'Currency',
    language: 'Language',
    search: 'Search',
    subscribe: 'Subscribe',
    emailPlaceholder: 'Enter your email address',
    allRights: 'All Rights Reserved',
    backToTop: 'Back to top',
    filter: 'Filter',
    sort: 'Sort',
    color: 'Color',
    brand: 'Brand',
    feature: 'Feature',
    outOfStock: 'Sold Out',
    price: 'Price',
    options: 'Select Options',
    quantity: 'Quantity',
  },
  home: {
    heroSlides: [
      {
        eyebrow: '2026 SS COLLECTION',
        title: 'Summer Clearance',
        subtitle: 'Biggest Discount of the Year',
        cta: 'View Detail',
      },
      {
        eyebrow: 'NEW SEASON',
        title: 'Seasonal Special',
        subtitle: 'Premium Golfwear',
        cta: 'Shop Now',
      },
    ],
    announcement: 'YouTube Live every night at 8PM — New arrivals first reveal',
    newArrivals: 'New Arrivals',
    newArrivalsSub: 'The most anticipated pieces this season',
    shopMen: 'Shop Men',
    shopWomen: 'Shop Women',
    brandsTitle: 'Brands',
    featuredTitle: 'Featured',
    featuredSub: 'MKGOLF curated best selection',
    subscribeTitle: 'Newsletter',
    subscribeSub: 'Get new arrivals and exclusive offers first',
    seoHeading: 'Premium Golfwear Store',
    seoBody:
      'MKGOLF offers premium golf fashion — men’s and women’s apparel, outerwear, knitwear, headwear and bags — at sensible prices. Domestic and international shipping, authentic guarantee and fast delivery for a satisfying shopping experience.',
  },
  footer: {
    about: 'About',
    help: 'Customer Care',
    policy: 'Terms & Policies',
    follow: 'Follow Us',
    customerService: 'Customer Service',
    shipping: 'Shipping',
    returns: 'Returns',
    faq: 'FAQ',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact',
    company: 'Company',
    copyright: 'Copyright MKGOLF — ',
  },
  product: {
    related: 'Related Products',
    reviews: 'Reviews',
    description: 'Description',
    size: 'Size',
    color: 'Color',
    sku: 'Product Code',
  },
};

export const dictionaries: Record<Locale, Dict> = { ko, zh, en };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale] ?? ko;
}
