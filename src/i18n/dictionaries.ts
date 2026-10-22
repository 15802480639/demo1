import type { Locale } from './config';

export type AuthDict = {
  errInvalidCredentials: string;
  errMissingFields: string;
  errServerError: string;
  errNotAdmin: string;
  errUsernameTaken: string;
  errInvalidEmail: string;
  errEmailTaken: string;
  errPasswordShort: string;
  errInvalidUsername: string;
  accountLabel: string;
  accountPh: string;
  usernameLabel: string;
  usernamePh: string;
  passwordPh: string;
  emailOptionalPh: string;
  emailHint: string;
};

export type InfoDict = {
  demoNotice: string;
};

export type CheckoutDict = {
  loginRequired: string;
  loginRequiredDesc: string;
  goRegister: string;
  goLogin: string;
  orderComplete: string;
  orderNo: string;
  myOrders: string;
  continueShopping: string;
  couponPlaceholder: string;
  apply: string;
  discountLabel: string;
  couponApplied: string;
  couponLimited: string;
  couponExpired: string;
  couponNotApplicable: string;
  couponInvalid: string;
  orderFailed: string;
  insufficientStock: string;
  emptyCart: string;
  countryDefault: string;
};

export type Dict = {
  auth: AuthDict;
  info: InfoDict;
  checkout: CheckoutDict;
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
    // —— 2026-10-19 全站 i18n 补齐新增键 ——
    skipToContent: string;
    remove: string;
    addAllToCart: string;
    stockCount: string;
    stockLimited: string;
    later: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    itemCount: string;
    all: string;
    noProducts: string;
    noProductsHint: string;
    viewAllProducts: string;
    searchHint: string;
    resultsCount: string;
    pageNotFound: string;
    pageNotFoundDesc: string;
    notFound: string;
    previousImage: string;
    nextImage: string;
    previousSlide: string;
    nextSlide: string;
    goToSlide: string;
    menu: string;
    pagination: string;
    noBrands: string;
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
    valueProps: { title: string; desc: string }[];
    newInEyebrow: string;
    heroEyebrow: string;
    collectionEyebrow: string;
    shopCta: string;
    subscribeFailed: string;
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
    specs: string;
    writeReview: string;
    reviewTitlePh: string;
    reviewContentPh: string;
    submitReview: string;
    reviewSubmitted: string;
    reviewFailed: string;
    categoryFallback: string;
    variantSoldOut: string;
  };
  events: {
    liveHeading: string;
    liveBody: string;
    liveBadge: string;
  };
  faq: {
    heading: string;
    intro: string;
    q1: string;
    a1: string;
  };
  account: AccountDict;
  admin: AdminDict;
};

export type AccountDict = {
  logout: string;  // 账户首页
  welcome: string;
  adminDashboard: string;
  myOrders: string;
  myAddresses: string;
  noAddresses: string;
  // 地址管理
  addAddress: string;
  editAddress: string;
  newAddress: string;
  recipient: string;
  phone: string;
  email: string;
  password: string;
  addressLabel: string;
  address2Label: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  setDefault: string;
  setDefaultCheck: string;
  defaultTag: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  requiredMissing: string;
  saveFailed: string;
  deleteConfirm: string;
  // 密码
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  update: string;
  pwdTooShort: string;
  pwdWrong: string;
  pwdFailed: string;
  pwdUpdated: string;
  // 订单列表 / 详情
  orderDate: string;
  all: string;
  trackingNo: string;
  copyTracking: string;
  shippingInfo: string;
  carrier: string;
  carrierPlaceholder: string;
  shipTo: string;
  subtotal: string;
  shippingFeeLabel: string;
  total: string;
  emptyOrders: string;
  goShopping: string;
  orderTimeline: string;
  qty: string;
  cancelOrder: string;
  cancelConfirm: string;
  notCancellable: string;
  cancelFailed: string;
  moreItems: string;
};

export type AdminDict = {
  console: string;
  dashboard: string;
  products: string;
  categories: string;
  brands: string;
  siteContent: string;
  orders: string;
  coupons: string;
  customers: string;
  banners: string;
  seo: string;
  geo: string;
  backToStore: string;
  logout: string;
  loginTitle: string;
  loginSubtitle: string;
  adminLogin: string;
  // 通用动作
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  add: string;
  delete: string;
  deleteConfirm: string;
  close: string;
  saveFailed: string;
  uploadFailed: string;
  all: string;
  search: string;
  // Dashboard
  overview: string;
  totalProducts: string;
  totalOrders: string;
  totalUsers: string;
  totalRevenue: string;
  recentOrders: string;
  // Products
  newProduct: string;
  editProduct: string;
  noProducts: string;
  name: string;
  code: string;
  gender: string;
  men: string;
  women: string;
  unisex: string;
  brand: string;
  status: string;
  category: string;
  price: string;
  description: string;
  image: string;
  imageRequired: string;
  order: string;
  uploadImage: string;
  draft: string;
  active: string;
  archived: string;
  // Orders
  noOrders: string;
  orderNo: string;
  customer: string;
  amount: string;
  date: string;
  paid: string;
  trackingNo: string;
  carrier: string;
  saveTracking: string;
  // Coupons
  newCoupon: string;
  editCoupon: string;
  noCoupons: string;
  code2: string;
  type: string;
  value: string;
  minSpend: string;
  start: string;
  end: string;
  usageLimit: string;
  fixed: string;
  percent: string;
  // Customers
  noCustomers: string;
  joined: string;
  spent: string;
  // Banners
  newBanner: string;
  editBanner: string;
  noBanners: string;
  bannerImage: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  published: string;
  // SEO
  seoIntro: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  gaId: string;
  gscVerification: string;
  bingVerification: string;
  naverVerification: string;
  // GEO
  geoIntro: string;
  geoFaqCount: string;
  geoProductCount: string;
  geoLinks: string;
  viewVerify: string;
  llmsIntro: string;
  llmsIntroHint: string;
  llmsIntroZh: string;
  llmsIntroEn: string;
  saveIntro: string;
  faqTitle: string;
  faqHint: string;
  newFaq: string;
  editFaq: string;
  noFaqs: string;
  question: string;
  answer: string;
  language: string;
  scope: string;
  scopeGlobal: string;
  scopeProduct: string;
  targetSlug: string;
  keywords: string;
  keywordsHint: string;
  addFaq: string;
  saveFaq: string;
  allLocales: string;
  // GEO 体检中心
  geoAudit: string;
  geoAuditIntro: string;
  geoAuditGrade: string;
  geoAuditRun: string;
  geoAuditRunning: string;
  geoScore: string;
  geoFactTitle: string;
  geoFactHint: string;
  geoFactNew: string;
  geoFactEdit: string;
  geoNoFacts: string;
  geoFactLabel: string;
  geoFactValue: string;
  geoFactKind: string;
  pushAll: string;
  pushResult: string;
  indexnowKey: string;
  companyInfo: string;
  socialLinks: string;
  baiduVerification: string;
  sogouVerification: string;
};

const ko: Dict = {
  auth: {
    errInvalidCredentials: '아이디 또는 비밀번호가 올바르지 않습니다',
    errMissingFields: '모든 항목을 입력해 주세요',
    errServerError: '오류가 발생했습니다. 다시 시도해 주세요',
    errNotAdmin: '관리자 계정이 아닙니다',
    errUsernameTaken: '이미 사용 중인 아이디입니다',
    errInvalidEmail: '올바른 이메일 주소를 입력해 주세요',
    errEmailTaken: '이미 가입된 이메일입니다',
    errPasswordShort: '비밀번호는 6자 이상이어야 합니다',
    errInvalidUsername: '아이디는 2~20자, 공백 없이 입력해 주세요',
    accountLabel: '아이디 / 이메일',
    accountPh: '가입한 아이디 또는 이메일',
    usernameLabel: '아이디',
    usernamePh: '영문, 숫자 조합',
    passwordPh: '6자 이상',
    emailOptionalPh: '선택 입력',
    emailHint: '주문 알림 수신용, 선택 입력',
  },
  info: {
    demoNotice:
      '본 페이지는 데모 콘텐츠입니다. 실제 운영 전 법무 검토를 거친 정식 약관으로 교체해 주세요.',
  },
  checkout: {
    loginRequired: '먼저 회원가입 또는 로그인해 주세요',
    loginRequiredDesc: '구매는 회원 전용 기능입니다. 가입 후 이용해 주세요.',
    goRegister: '회원가입',
    goLogin: '로그인',
    orderComplete: '주문 완료',
    orderNo: '주문번호',
    myOrders: '주문 내역',
    continueShopping: '쇼핑 계속하기',
    couponPlaceholder: '쿠폰',
    apply: '적용',
    discountLabel: '할인',
    couponApplied: '✓ -',
    couponLimited: '（적용 상품 한정）',
    couponExpired: '만료된 쿠폰입니다',
    couponNotApplicable: '장바구니에 해당 쿠폰 적용 상품이 없습니다',
    couponInvalid: '유효하지 않은 쿠폰입니다',
    orderFailed: '주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    insufficientStock: '의 재고가 부족합니다',
    emptyCart: '장바구니가 비어 있습니다',
    countryDefault: '대한민국',
  },
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
    skipToContent: '본문 바로가기',
    remove: '삭제',
    addAllToCart: '전체 담기',
    stockCount: '재고 {n}개',
    stockLimited: '재고 {n}개 — 수량을 조절해 주세요',
    later: '나중에',
    sortNewest: '최신순',
    sortPriceAsc: '가격 낮은순',
    sortPriceDesc: '가격 높은순',
    itemCount: '전체 {n}개',
    all: '전체',
    noProducts: '상품이 없습니다',
    noProductsHint: '다른 조건으로 검색해 보세요.',
    viewAllProducts: '전체 상품 보기',
    searchHint: '검색어를 입력하세요',
    resultsCount: '{n}개의 결과',
    pageNotFound: '요청하신 페이지를 찾을 수 없습니다',
    pageNotFoundDesc: '페이지가 이동되었거나 존재하지 않습니다. 홈에서 다시 시작해 주세요.',
    notFound: '페이지를 찾을 수 없음',
    previousImage: '이전 이미지',
    nextImage: '다음 이미지',
    previousSlide: '이전 슬라이드',
    nextSlide: '다음 슬라이드',
    goToSlide: '{n}번 슬라이드로 이동',
    menu: '메뉴',
    pagination: '페이지네이션',
    noBrands: '등록된 브랜드가 없습니다',
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
    newArrivals: '신상품',
    newArrivalsSub: '이번 시즌 가장 주목받는 아이템',
    shopMen: '남성 쇼핑',
    shopWomen: '여성 쇼핑',
    brandsTitle: '브랜드',
    featuredTitle: '추천 상품',
    featuredSub: '제이앤디가 엄선한 베스트 셀렉션',
    subscribeTitle: '뉴스레터 구독',
    subscribeSub: '신상품과 단독 혜택을 가장 먼저 받아보세요',
    seoHeading: '프리미엄 골프웨어 쇼핑몰',
    seoBody:
      '제이앤디는 남녀 골프웨어, 아우터, 니트, 모자, 가방 등 프리미엄 골프 패션을 합리적인 가격에 제공합니다. 국내외 배송 지원, 정품 보증, 빠른 배송으로 만족도 높은 쇼핑 경험을 약속합니다.',
    valueProps: [
      { title: '정품 보증', desc: '제이앤디 공식 정품만 취급합니다' },
      { title: '국내·해외 배송', desc: '전 세계 어디든 안전하게 보내드립니다' },
      { title: '빠른 출고', desc: '영업일 기준 1~2일 내 신속 발송' },
    ],
    newInEyebrow: '신상품',
    heroEyebrow: '추천 컬렉션',
    collectionEyebrow: '컬렉션',
    shopCta: '쇼핑',
    subscribeFailed: '오류가 발생했습니다. 다시 시도해 주세요.',
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
    copyright: 'Copyright J&D — ',
  },
  product: {
    related: '관련 상품',
    reviews: '리뷰',
    description: '상품 설명',
    size: '사이즈',
    color: '색상',
    sku: '상품코드',
    specs: '제품 사양',
    writeReview: '구매 후기 작성',
    reviewTitlePh: '제목',
    reviewContentPh: '후기 내용',
    submitReview: '리뷰 등록',
    reviewSubmitted: '리뷰가 등록되었습니다.',
    reviewFailed: '리뷰 등록에 실패했습니다',
    categoryFallback: '골프웨어',
    variantSoldOut: '품절된 상품입니다',
  },
  events: {
    liveHeading: '매일 저녁 8시 유튜브 라이브',
    liveBody: '매일 저녁 8시 유튜브 라이브 — 신상품 최초 공개',
    liveBadge: 'LIVE',
  },
  faq: {
    heading: '자주 묻는 질문',
    intro: 'J&D(제이앤디) 골프웨어의 배송, 교환·반품, 사이즈, 결제 등 자주 묻는 질문 모음입니다.',
    q1: '제이앤디는 어떤 브랜드인가요?',
    a1: 'J&D(제이앤디)는 남녀 골프웨어, 아우터, 니트, 모자, 신발, 골프가방을 판매하는 프리미엄 골프 패션 온라인몰입니다.',
  },
  account: {
    logout: '로그아웃',
    welcome: '마이페이지',
    adminDashboard: '관리자 페이지',
    myOrders: '주문 내역',
    myAddresses: '배송지 관리',
    noAddresses: '등록된 배송지가 없습니다',
    addAddress: '추가',
    editAddress: '배송지 수정',
    newAddress: '배송지 추가',
    recipient: '받는 분',
    phone: '전화번호',
    email: '이메일',
    password: '비밀번호',
    addressLabel: '주소',
    address2Label: '상세주소',
    city: '도시',
    state: '지역',
    postal: '우편번호',
    country: '국가',
    setDefault: '기본설정',
    setDefaultCheck: '기본 배송지로 설정',
    defaultTag: '기본',
    edit: '수정',
    delete: '삭제',
    save: '저장',
    cancel: '취소',
    requiredMissing: '필수 항목을 입력하세요',
    saveFailed: '저장에 실패했습니다',
    deleteConfirm: '이 배송지를 삭제할까요?',
    changePassword: '비밀번호 변경',
    currentPassword: '현재 비밀번호',
    newPassword: '새 비밀번호 (6자 이상)',
    update: '변경',
    pwdTooShort: '비밀번호는 6자 이상이어야 합니다',
    pwdWrong: '현재 비밀번호가 일치하지 않습니다',
    pwdFailed: '변경에 실패했습니다',
    pwdUpdated: '비밀번호가 변경되었습니다',
    orderDate: '주문일',
    all: '전체',
    trackingNo: '운송장 번호',
    copyTracking: '운송장 번호 복사',
    shippingInfo: '배송 조회',
    carrier: '택배사',
    carrierPlaceholder: '택배사',
    shipTo: '배송지',
    subtotal: '소계',
    shippingFeeLabel: '배송비',
    total: '총 결제금액',
    emptyOrders: '주문 내역이 없습니다',
    goShopping: '쇼핑하러 가기',
    orderTimeline: '주문 진행 상황',
    qty: '수량',
    cancelOrder: '주문 취소',
    cancelConfirm: '주문을 취소하시겠습니까?',
    notCancellable: '이미 처리된 주문은 취소할 수 없습니다',
    cancelFailed: '취소에 실패했습니다',
    moreItems: '외 {n}건',
  },
  admin: {
    console: '관리자 콘솔',
    dashboard: '대시보드',
    products: '상품 관리',
    categories: '카테고리 관리',
    brands: '브랜드 관리',
    siteContent: '페이지 콘텐츠',
    orders: '주문 관리',
    coupons: '쿠폰',
    customers: '고객',
    banners: '배너',
    seo: 'SEO 설정',
    geo: 'GEO 지식베이스',
    backToStore: '스토어로 돌아가기',
    logout: '로그아웃',
    loginTitle: '관리자',
    loginSubtitle: '관리자 계정으로 로그인',
    adminLogin: '관리자 로그인',
    save: '저장',
    saving: '저장 중',
    cancel: '취소',
    edit: '수정',
    add: '추가',
    delete: '삭제',
    deleteConfirm: '정말 삭제할까요? 되돌릴 수 없습니다.',
    close: '닫기',
    saveFailed: '저장에 실패했습니다',
    uploadFailed: '업로드에 실패했습니다',
    all: '전체',
    search: '검색',
    overview: '요약',
    totalProducts: '총 상품',
    totalOrders: '총 주문',
    totalUsers: '총 고객',
    totalRevenue: '총 매출',
    recentOrders: '최근 주문',
    newProduct: '신규 상품',
    editProduct: '상품 수정',
    noProducts: '등록된 상품이 없습니다',
    name: '상품명',
    code: '상품코드',
    gender: '성별',
    men: '남성',
    women: '여성',
    unisex: '공용',
    brand: '브랜드',
    status: '상태',
    category: '카테고리',
    price: '가격',
    description: '상품 설명',
    image: '이미지',
    imageRequired: '이미지를 선택하세요',
    order: '정렬 순서',
    uploadImage: '이미지 업로드',
    draft: '임시저장',
    active: '판매중',
    archived: '보관됨',
    noOrders: '주문이 없습니다',
    orderNo: '주문번호',
    customer: '고객',
    amount: '금액',
    date: '날짜',
    paid: '결제완료',
    trackingNo: '운송장번호',
    carrier: '택배사',
    saveTracking: '저장',
    newCoupon: '신규 쿠폰',
    editCoupon: '쿠폰 수정',
    noCoupons: '등록된 쿠폰이 없습니다',
    code2: '쿠폰 코드',
    type: '유형',
    value: '할인 금액',
    minSpend: '최소 구매금액',
    start: '시작일',
    end: '종료일',
    usageLimit: '사용 가능 횟수',
    fixed: '정액',
    percent: '정률',
    noCustomers: '등록된 고객이 없습니다',
    joined: '가입일',
    spent: '구매액',
    newBanner: '신규 배너',
    editBanner: '배너 수정',
    noBanners: '등록된 배너가 없습니다',
    bannerImage: '배너 이미지',
    title: '제목',
    subtitle: '부제',
    ctaText: '버튼 문구',
    ctaLink: '버튼 링크',
    published: '게시중',
    seoIntro: '검색 엔진과 AI가 이 사이트를 이해하도록 메타 정보를 설정합니다.',
    metaTitle: '기본 제목',
    metaDescription: '기본 설명',
    metaKeywords: '키워드',
    ogImage: '공유 이미지',
    gaId: 'Google Analytics ID',
    gscVerification: 'Google Search Console 인증코드',
    bingVerification: 'Bing 인증코드',
    naverVerification: 'Naver 인증코드',
    geoIntro:
      '생성형 엔진 최적화(GEO): AI 검색엔진이 직접 인용할 수 있는 FAQ 지식베이스와 llms.txt 소개 문구를 관리합니다. 여기서 수정한 FAQ는 FAQ 페이지·llms.txt·FAQPage 구조화 데이터에 즉시 반영됩니다.',
    geoFaqCount: 'FAQ 개수',
    geoProductCount: '상품 / 카테고리',
    geoLinks: '출력 파일 확인',
    viewVerify: '보기 / 검증',
    llmsIntro: 'llms.txt 소개 문구',
    llmsIntroHint:
      '비워 두면 기본 영문 문구가 사용됩니다. 입력하면 llms.txt 상단 소개 영역을 덮어쓰고, 사이트 이해도를 높이는 중국어 소개 문단도 추가할 수 있습니다.',
    llmsIntroZh: '소개 문구 (중국어)',
    llmsIntroEn: '소개 문구 (영어, 기본값 덮어쓰기)',
    saveIntro: '소개 문구 저장',
    faqTitle: 'FAQ 질문 / 답변',
    faqHint:
      '각 FAQ는 FAQ 페이지·llms.txt·FAQPage JSON-LD에 동시에 나타나 AI 검색이 직접 인용할 수 있습니다.',
    newFaq: 'FAQ 추가',
    editFaq: 'FAQ 수정',
    noFaqs: '등록된 FAQ가 없습니다',
    question: '질문',
    answer: '답변',
    language: '언어',
    scope: '적용 범위',
    scopeGlobal: '사이트 전체',
    scopeProduct: '특정 상품',
    targetSlug: '상품 slug',
    keywords: '트리거 키워드 (쉼표 구분, 선택)',
    keywordsHint: 'AI 검색엔진이 관련 질문에 이 답변을 연결하도록 도와줍니다.',
    addFaq: 'FAQ 추가',
    saveFaq: 'FAQ 저장',
    allLocales: '전체 언어',
    geoAudit: 'GEO 체크',
    geoAuditIntro:
      '6개 차원 가중 점수로 지금 AI 엔진이 이 사이트를 얼마나 잘 이해하는지 진단합니다. 항목별 미비 사항과 해결 방법을 바로 알려줍니다.',
    geoAuditGrade: '종합등급',
    geoAuditRun: '진단 실행',
    geoAuditRunning: '진단 중…',
    geoScore: '점수',
    geoFactTitle: '엔티티 프로필',
    geoFactHint:
      '브랜드 정체성, 제품 분류, 배송지 등 AI가 검증할 수 있는 사실만 기입하세요. llms.txt·llms-full.txt·Organization 구조화 데이터에 자동 반영됩니다.',
    geoFactNew: '팩트 추가',
    geoFactEdit: '팩트 수정',
    geoNoFacts: '등록된 팩트가 없습니다',
    geoFactLabel: '항목',
    geoFactValue: '내용',
    geoFactKind: '유형',
    pushAll: 'IndexNow 전체推送',
    pushResult: '전송 결과',
    indexnowKey: 'IndexNow 키',
    companyInfo: '회사 정보',
    socialLinks: '동일 계정(SameAs)',
    baiduVerification: '百度验证码',
    sogouVerification: '搜狗验证码',
  },
};

const zh: Dict = {
  auth: {
    errInvalidCredentials: '账号或密码不正确',
    errMissingFields: '请填写所有必填项',
    errServerError: '发生错误，请稍后重试',
    errNotAdmin: '该账号不是管理员',
    errUsernameTaken: '该账号已被注册',
    errInvalidEmail: '请输入正确的邮箱地址',
    errEmailTaken: '该邮箱已注册',
    errPasswordShort: '密码至少 6 位',
    errInvalidUsername: '账号需 2-20 位且不能带空格',
    accountLabel: '账号 / 邮箱',
    accountPh: '注册时的账号或邮箱',
    usernameLabel: '账号',
    usernamePh: '字母、数字组合',
    passwordPh: '6 位以上',
    emailOptionalPh: '选填',
    emailHint: '用于接收订单通知，可不填',
  },
  info: {
    demoNotice: '本页面为演示内容。正式上线前请替换为经法务审核的正式条款。',
  },
  checkout: {
    loginRequired: '请先注册或登录',
    loginRequiredDesc: '购买商品需要会员账号。注册后即可加入购物车并下单。',
    goRegister: '去注册',
    goLogin: '去登录',
    orderComplete: '订单完成',
    orderNo: '订单号',
    myOrders: '我的订单',
    continueShopping: '继续购物',
    couponPlaceholder: '优惠券',
    apply: '使用',
    discountLabel: '优惠',
    couponApplied: '✓ -',
    couponLimited: '（限适用商品）',
    couponExpired: '优惠券已过期',
    couponNotApplicable: '购物车中没有该优惠券的适用商品',
    couponInvalid: '优惠券无效',
    orderFailed: '下单失败，请稍后重试',
    insufficientStock: '库存不足',
    emptyCart: '购物车是空的',
    countryDefault: '中国',
  },
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
    skipToContent: '跳到主要内容',
    remove: '删除',
    addAllToCart: '全部加入购物车',
    stockCount: '库存 {n} 件',
    stockLimited: '库存 {n} 件 — 请调整数量',
    later: '暂不',
    sortNewest: '最新',
    sortPriceAsc: '价格从低到高',
    sortPriceDesc: '价格从高到低',
    itemCount: '共 {n} 件',
    all: '全部',
    noProducts: '没有找到商品',
    noProductsHint: '换个筛选条件，或看看全部商品。',
    viewAllProducts: '查看全部商品',
    searchHint: '请输入搜索词',
    resultsCount: '{n} 个结果',
    pageNotFound: '找不到您访问的页面',
    pageNotFoundDesc: '页面可能已被移动或不存在，请从首页重新开始。',
    notFound: '页面不存在',
    previousImage: '上一张图片',
    nextImage: '下一张图片',
    previousSlide: '上一张轮播',
    nextSlide: '下一张轮播',
    goToSlide: '跳到第 {n} 张轮播',
    menu: '菜单',
    pagination: '分页',
    noBrands: '暂无品牌',
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
    newArrivals: '新品上市',
    newArrivalsSub: '本季最受瞩目的单品',
    shopMen: '逛男装',
    shopWomen: '逛女装',
    brandsTitle: '品牌',
    featuredTitle: '精选推荐',
    featuredSub: 'J&D 严选最佳系列',
    subscribeTitle: '订阅电子报',
    subscribeSub: '第一时间获取新品与专属优惠',
    seoHeading: '高端高尔夫服饰商城',
    seoBody:
      'J&D 以合理的价格提供男女高尔夫服饰、外套、针织、帽子、包袋等高端高尔夫时尚。支持国内外配送、正品保证与快速发货，为您带来满意的购物体验。',
    valueProps: [
      { title: '正品保证', desc: '仅销售 J&D 官方正品' },
      { title: '国内・海外配送', desc: '全球配送，安全送达' },
      { title: '快速发货', desc: '工作日 1~2 天内快速发出' },
    ],
    newInEyebrow: '新品上架',
    heroEyebrow: '精选推荐',
    collectionEyebrow: '精选系列',
    shopCta: '去逛逛',
    subscribeFailed: '提交失败，请重试',
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
    copyright: '版权所有 J&D — ',
  },
  product: {
    related: '相关商品',
    reviews: '评价',
    description: '商品描述',
    size: '尺码',
    color: '颜色',
    sku: '商品货号',
    specs: '商品规格',
    writeReview: '写评价',
    reviewTitlePh: '标题',
    reviewContentPh: '您的评价',
    submitReview: '提交评价',
    reviewSubmitted: '评价已提交，感谢您的反馈！',
    reviewFailed: '评价提交失败',
    categoryFallback: '高尔夫服饰',
    variantSoldOut: '该规格已售罄',
  },
  events: {
    liveHeading: '每晚 8 点 YouTube 直播',
    liveBody: '每晚 8 点 YouTube 直播 —— 新品首发',
    liveBadge: '直播中',
  },
  faq: {
    heading: '常见问题',
    intro: 'J&D（제이앤디）高尔夫服饰的配送、退换货、尺码、支付等常见问题解答。',
    q1: 'J&D 是什么品牌？',
    a1: 'J&D（제이앤디）是销售男女高尔夫服饰、外套、针织、帽子、鞋履与高尔夫包袋的高端高尔夫时尚线上商城。',
  },
  account: {
    logout: '退出登录',
    welcome: '我的账户',
    adminDashboard: '管理后台',
    myOrders: '我的订单',
    myAddresses: '收货地址',
    noAddresses: '暂无收货地址',
    addAddress: '添加',
    editAddress: '编辑地址',
    newAddress: '新增地址',
    recipient: '收件人',
    phone: '电话',
    email: '邮箱',
    password: '密码',
    addressLabel: '地址',
    address2Label: '详细地址',
    city: '城市',
    state: '省份/州',
    postal: '邮编',
    country: '国家',
    setDefault: '设为默认',
    setDefaultCheck: '设为默认地址',
    defaultTag: '默认',
    edit: '编辑',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    requiredMissing: '请填写必填项',
    saveFailed: '保存失败',
    deleteConfirm: '确定删除这个地址吗？',
    changePassword: '修改密码',
    currentPassword: '当前密码',
    newPassword: '新密码（6 位以上）',
    update: '更新',
    pwdTooShort: '密码至少 6 位',
    pwdWrong: '当前密码不正确',
    pwdFailed: '修改失败',
    pwdUpdated: '密码已修改',
    orderDate: '下单时间',
    all: '全部',
    trackingNo: '运单号',
    copyTracking: '复制运单号',
    shippingInfo: '物流信息',
    carrier: '快递公司',
    carrierPlaceholder: '快递公司',
    shipTo: '收货地址',
    subtotal: '商品小计',
    shippingFeeLabel: '运费',
    total: '合计',
    emptyOrders: '还没有订单',
    goShopping: '去逛逛',
    orderTimeline: '订单进度',
    qty: '数量',
    cancelOrder: '取消订单',
    cancelConfirm: '确定要取消这个订单吗？',
    notCancellable: '订单已进入处理流程，无法取消',
    cancelFailed: '取消失败',
    moreItems: '等 {n} 件',
  },
  admin: {
    console: '管理控制台',
    dashboard: '数据概览',
    products: '商品管理',
    categories: '分类管理',
    brands: '品牌管理',
    siteContent: '页面内容',
    orders: '订单管理',
    coupons: '优惠券',
    customers: '客户管理',
    banners: '首页轮播',
    seo: 'SEO 设置',
    geo: 'GEO 知识库',
    backToStore: '返回商城',
    logout: '退出登录',
    loginTitle: '后台管理',
    loginSubtitle: '用管理员账号登录',
    adminLogin: '管理员登录',
    save: '保存',
    saving: '保存中',
    cancel: '取消',
    edit: '编辑',
    add: '新增',
    delete: '删除',
    deleteConfirm: '确定删除吗？此操作不可撤销。',
    close: '关闭',
    saveFailed: '保存失败',
    uploadFailed: '上传失败',
    all: '全部',
    search: '搜索',
    overview: '概览',
    totalProducts: '商品总数',
    totalOrders: '订单总数',
    totalUsers: '客户总数',
    totalRevenue: '总销售额',
    recentOrders: '最近订单',
    newProduct: '新增商品',
    editProduct: '编辑商品',
    noProducts: '暂无商品',
    name: '商品名称',
    code: '商品编码',
    gender: '适用性别',
    men: '男',
    women: '女',
    unisex: '中性',
    brand: '品牌',
    status: '状态',
    category: '分类',
    price: '价格',
    description: '商品描述',
    image: '图片',
    imageRequired: '请选择图片',
    order: '排序',
    uploadImage: '上传图片',
    draft: '草稿',
    active: '在售',
    archived: '已归档',
    noOrders: '暂无订单',
    orderNo: '订单号',
    customer: '客户',
    amount: '金额',
    date: '日期',
    paid: '已支付',
    trackingNo: '物流单号',
    carrier: '快递公司',
    saveTracking: '保存',
    newCoupon: '新增优惠券',
    editCoupon: '编辑优惠券',
    noCoupons: '暂无优惠券',
    code2: '券码',
    type: '类型',
    value: '优惠额度',
    minSpend: '最低消费',
    start: '开始日期',
    end: '结束日期',
    usageLimit: '可用次数',
    fixed: '固定金额',
    percent: '折扣百分比',
    noCustomers: '暂无客户',
    joined: '注册时间',
    spent: '消费金额',
    newBanner: '新增轮播',
    editBanner: '编辑轮播',
    noBanners: '暂无轮播图',
    bannerImage: '轮播图片',
    title: '标题',
    subtitle: '副标题',
    ctaText: '按钮文字',
    ctaLink: '按钮链接',
    published: '已发布',
    seoIntro: '配置搜索引擎与 AI 理解本站所需的元信息。',
    metaTitle: '默认标题',
    metaDescription: '默认描述',
    metaKeywords: '关键词',
    ogImage: '分享图片',
    gaId: 'Google Analytics ID',
    gscVerification: 'Google Search Console 验证码',
    bingVerification: 'Bing 验证码',
    naverVerification: 'Naver 验证码',
    geoIntro:
      '生成式引擎优化（GEO）：维护可被 AI 搜索引擎直接引用的多语种 FAQ 知识库，并自定义 llms.txt 站点导语。这里的每条 FAQ 会同时同步到前台 FAQ 页、llms.txt 与 FAQPage 结构化数据。',
    geoFaqCount: 'FAQ 条数',
    geoProductCount: '商品 / 分类',
    geoLinks: '输出文件校验',
    viewVerify: '查看 / 校验',
    llmsIntro: 'llms.txt 站点导语',
    llmsIntroHint:
      '留空则使用系统默认导语。填写后会覆盖 llms.txt 顶部导语，还能补充中文介绍段，帮助 AI 引擎更准确地理解站点。',
    llmsIntroZh: '导语（中文）',
    llmsIntroEn: '导语（英文，覆盖默认）',
    saveIntro: '保存导语',
    faqTitle: 'FAQ 知识问答',
    faqHint:
      '每条 FAQ 会同时出现在前台 FAQ 页、llms.txt 与 FAQPage JSON-LD 中，供 AI 搜索直接引用。',
    newFaq: '新增 FAQ',
    editFaq: '编辑 FAQ',
    noFaqs: '暂无 FAQ',
    question: '问题',
    answer: '回答',
    language: '语种',
    scope: '适用范围',
    scopeGlobal: '全站通用',
    scopeProduct: '指定商品',
    targetSlug: '商品 slug',
    keywords: '触发关键词（逗号分隔，可选）',
    keywordsHint: '帮助 AI 搜索引擎把相关问题关联到这条问答。',
    addFaq: '添加 FAQ',
    saveFaq: '保存 FAQ',
    allLocales: '全语种通用',
    geoAudit: 'GEO 体检',
    geoAuditIntro:
      '六维度加权打分，一眼看出 AI 搜索引擎现在能理解本站多少。每项都给出缺失说明与修复方法。',
    geoAuditGrade: '综合评级',
    geoAuditRun: '开始体检',
    geoAuditRunning: '体检中…',
    geoScore: '得分',
    geoFactTitle: '实体档案',
    geoFactHint:
      '只写 AI 可核对的事实：品牌定位、品类词、发货地、支付方式。保存后自动同步到 llms.txt、llms-full.txt 与 Organization 结构化数据。',
    geoFactNew: '新增事实',
    geoFactEdit: '编辑事实',
    geoNoFacts: '暂无实体档案（系统会用内置模板兜底）',
    geoFactLabel: '事实项',
    geoFactValue: '内容',
    geoFactKind: '类型',
    pushAll: 'IndexNow 全站推送',
    pushResult: '推送结果',
    indexnowKey: 'IndexNow 密钥',
    companyInfo: '公司信息',
    socialLinks: '同款账号 SameAs',
    baiduVerification: '百度验证码',
    sogouVerification: '搜狗验证码',
  },
};

const en: Dict = {
  auth: {
    errInvalidCredentials: 'Incorrect account or password',
    errMissingFields: 'Please fill in all required fields',
    errServerError: 'Something went wrong. Please try again.',
    errNotAdmin: 'This account is not an administrator',
    errUsernameTaken: 'This username is already taken',
    errInvalidEmail: 'Please enter a valid email address',
    errEmailTaken: 'This email is already registered',
    errPasswordShort: 'Password must be at least 6 characters',
    errInvalidUsername: 'Username must be 2-20 characters without spaces',
    accountLabel: 'Account / Email',
    accountPh: 'Your registered account or email',
    usernameLabel: 'Account',
    usernamePh: 'Letters and numbers',
    passwordPh: '6+ characters',
    emailOptionalPh: 'Optional',
    emailHint: 'For order notifications (optional)',
  },
  info: {
    demoNotice:
      'This page contains demo content. Replace with legally reviewed terms before going live.',
  },
  checkout: {
    loginRequired: 'Please register or sign in first',
    loginRequiredDesc: 'Purchases require a member account. Register to add items to your cart and check out.',
    goRegister: 'Register',
    goLogin: 'Sign in',
    orderComplete: 'Order Complete',
    orderNo: 'Order No.',
    myOrders: 'My Orders',
    continueShopping: 'Continue Shopping',
    couponPlaceholder: 'COUPON',
    apply: 'Apply',
    discountLabel: 'Discount',
    couponApplied: '✓ -',
    couponLimited: '(applicable items only)',
    couponExpired: 'This coupon has expired',
    couponNotApplicable: 'No applicable items for this coupon in your cart',
    couponInvalid: 'Invalid coupon',
    orderFailed: 'Order failed. Please try again.',
    insufficientStock: 'Insufficient stock: ',
    emptyCart: 'Your cart is empty',
    countryDefault: 'South Korea',
  },
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
    skipToContent: 'Skip to content',
    remove: 'Remove',
    addAllToCart: 'Add all to cart',
    stockCount: '{n} in stock',
    stockLimited: 'Only {n} in stock — please adjust the quantity',
    later: 'Later',
    sortNewest: 'Newest',
    sortPriceAsc: 'Price ↑',
    sortPriceDesc: 'Price ↓',
    itemCount: '{n} items',
    all: 'All',
    noProducts: 'No products found',
    noProductsHint: 'Try different filters, or browse all products.',
    viewAllProducts: 'View all products',
    searchHint: 'Start typing to search',
    resultsCount: '{n} results',
    pageNotFound: 'The page you requested could not be found',
    pageNotFoundDesc: 'The page may have moved or no longer exists. Please start again from the home page.',
    notFound: 'Page not found',
    previousImage: 'Previous image',
    nextImage: 'Next image',
    previousSlide: 'Previous slide',
    nextSlide: 'Next slide',
    goToSlide: 'Go to slide {n}',
    menu: 'Menu',
    pagination: 'Pagination',
    noBrands: 'No brands yet.',
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
    newArrivals: 'New Arrivals',
    newArrivalsSub: 'The most anticipated pieces this season',
    shopMen: 'Shop Men',
    shopWomen: 'Shop Women',
    brandsTitle: 'Brands',
    featuredTitle: 'Featured',
    featuredSub: 'J&D curated best selection',
    subscribeTitle: 'Newsletter',
    subscribeSub: 'Get new arrivals and exclusive offers first',
    seoHeading: 'Premium Golfwear Store',
    seoBody:
      'J&D offers premium golf fashion — men’s and women’s apparel, outerwear, knitwear, headwear and bags — at sensible prices. Domestic and international shipping, authentic guarantee and fast delivery for a satisfying shopping experience.',
    valueProps: [
      { title: 'Authentic Guarantee', desc: 'Only official genuine J&D products' },
      { title: 'Worldwide Shipping', desc: 'Safe delivery to anywhere in the world' },
      { title: 'Fast Dispatch', desc: 'Shipped within 1–2 business days' },
    ],
    newInEyebrow: 'New In',
    heroEyebrow: 'Featured Collection',
    collectionEyebrow: 'Collection',
    shopCta: 'Shop',
    subscribeFailed: 'Something went wrong. Please try again.',
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
    copyright: 'Copyright J&D — ',
  },
  product: {
    related: 'Related Products',
    reviews: 'Reviews',
    description: 'Description',
    size: 'Size',
    color: 'Color',
    sku: 'Product Code',
    specs: 'Specifications',
    writeReview: 'Write a review',
    reviewTitlePh: 'Title',
    reviewContentPh: 'Your review',
    submitReview: 'Submit Review',
    reviewSubmitted: 'Review submitted. Thank you!',
    reviewFailed: 'Failed to submit review',
    categoryFallback: 'Golfwear',
    variantSoldOut: 'This item is sold out',
  },
  events: {
    liveHeading: 'YouTube Live every night at 8PM',
    liveBody: 'YouTube Live every night at 8PM — New arrivals first reveal',
    liveBadge: 'LIVE',
  },
  faq: {
    heading: 'Frequently Asked Questions',
    intro: 'Answers about J&D golf apparel shipping, returns, sizing and payment.',
    q1: 'What is J&D?',
    a1: 'J&D (제이앤디) is a premium golf fashion online store selling men’s and women’s golf apparel, outerwear, knitwear, headwear, shoes and golf bags.',
  },
  account: {
    logout: 'Logout',
    welcome: 'My Account',
    adminDashboard: 'Admin Dashboard',
    myOrders: 'My Orders',
    myAddresses: 'My Addresses',
    noAddresses: 'No saved addresses',
    addAddress: 'Add',
    editAddress: 'Edit Address',
    newAddress: 'New Address',
    recipient: 'Recipient',
    phone: 'Phone',
    email: 'Email',
    password: 'Password',
    addressLabel: 'Address',
    address2Label: 'Address 2',
    city: 'City',
    state: 'State',
    postal: 'Postal',
    country: 'Country',
    setDefault: 'Set default',
    setDefaultCheck: 'Set as default',
    defaultTag: 'DEFAULT',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    requiredMissing: 'Required fields missing',
    saveFailed: 'Save failed',
    deleteConfirm: 'Delete this address?',
    changePassword: 'Change Password',
    currentPassword: 'Current',
    newPassword: 'New (6+)',
    update: 'Update',
    pwdTooShort: 'Password must be at least 6 characters',
    pwdWrong: 'Wrong current password',
    pwdFailed: 'Failed to change password',
    pwdUpdated: 'Password updated',
    orderDate: 'Order date',
    all: 'All',
    trackingNo: 'Tracking No.',
    copyTracking: 'Copy tracking no.',
    shippingInfo: 'Shipping',
    carrier: 'Carrier',
    carrierPlaceholder: 'Carrier',
    shipTo: 'Ship to',
    subtotal: 'Subtotal',
    shippingFeeLabel: 'Shipping',
    total: 'Total',
    emptyOrders: 'No orders yet',
    goShopping: 'Start shopping',
    orderTimeline: 'Order progress',
    qty: 'Qty',
    cancelOrder: 'Cancel Order',
    cancelConfirm: 'Cancel this order?',
    notCancellable: 'This order can no longer be cancelled',
    cancelFailed: 'Cancel failed',
    moreItems: '+{n} more',
  },
  admin: {
    console: 'Admin Console',
    dashboard: 'Dashboard',
    products: 'Products',
    categories: 'Categories',
    brands: 'Brands',
    siteContent: 'Page Content',
    orders: 'Orders',
    coupons: 'Coupons',
    customers: 'Customers',
    banners: 'Banners',
    seo: 'SEO Settings',
    geo: 'GEO Knowledge Base',
    backToStore: 'Back to store',
    logout: 'Logout',
    loginTitle: 'Admin',
    loginSubtitle: 'Sign in with an administrator account',
    adminLogin: 'Admin Login',
    save: 'Save',
    saving: 'Saving',
    cancel: 'Cancel',
    edit: 'Edit',
    add: 'Add',
    delete: 'Delete',
    deleteConfirm: 'Delete this item? This cannot be undone.',
    close: 'Close',
    saveFailed: 'Save failed',
    uploadFailed: 'Upload failed',
    all: 'All',
    search: 'Search',
    overview: 'Overview',
    totalProducts: 'Total products',
    totalOrders: 'Total orders',
    totalUsers: 'Total customers',
    totalRevenue: 'Total revenue',
    recentOrders: 'Recent orders',
    newProduct: 'New Product',
    editProduct: 'Edit Product',
    noProducts: 'No products',
    name: 'Name',
    code: 'Code',
    gender: 'Gender',
    men: 'Men',
    women: 'Women',
    unisex: 'Unisex',
    brand: 'Brand',
    status: 'Status',
    category: 'Category',
    price: 'Price',
    description: 'Description',
    image: 'Image',
    imageRequired: 'Please choose an image',
    order: 'Order',
    uploadImage: 'Upload image',
    draft: 'Draft',
    active: 'Active',
    archived: 'Archived',
    noOrders: 'No orders',
    orderNo: 'Order no.',
    customer: 'Customer',
    amount: 'Amount',
    date: 'Date',
    paid: 'Paid',
    trackingNo: 'Tracking no.',
    carrier: 'Carrier',
    saveTracking: 'Save',
    newCoupon: 'New Coupon',
    editCoupon: 'Edit Coupon',
    noCoupons: 'No coupons',
    code2: 'Code',
    type: 'Type',
    value: 'Value',
    minSpend: 'Min spend',
    start: 'Start',
    end: 'End',
    usageLimit: 'Usage limit',
    fixed: 'Fixed',
    percent: 'Percent',
    noCustomers: 'No customers yet',
    joined: 'Joined',
    spent: 'Spent',
    newBanner: 'New Banner',
    editBanner: 'Edit Banner',
    noBanners: 'No banners yet',
    bannerImage: 'Banner image',
    title: 'Title',
    subtitle: 'Subtitle',
    ctaText: 'CTA text',
    ctaLink: 'CTA link',
    published: 'Published',
    seoIntro: 'Configure the meta information search engines and AI need to understand this site.',
    metaTitle: 'Default title',
    metaDescription: 'Default description',
    metaKeywords: 'Keywords',
    ogImage: 'Share image',
    gaId: 'Google Analytics ID',
    gscVerification: 'Google Search Console verification',
    bingVerification: 'Bing verification',
    naverVerification: 'Naver verification',
    geoIntro:
      'Generative Engine Optimization (GEO): maintain a multi-language FAQ knowledge base that AI search engines can quote directly, and customise the llms.txt site preamble. Every FAQ saved here syncs to the public FAQ page, llms.txt and the FAQPage structured data at once.',
    geoFaqCount: 'FAQ entries',
    geoProductCount: 'Products / categories',
    geoLinks: 'Output files',
    viewVerify: 'View / verify',
    llmsIntro: 'llms.txt site preamble',
    llmsIntroHint:
      'Leave blank to use the built-in preamble. Filling this in overrides the top of llms.txt and lets you add a Chinese introduction, which helps AI engines understand the site better.',
    llmsIntroZh: 'Preamble (Chinese)',
    llmsIntroEn: 'Preamble (English, overrides default)',
    saveIntro: 'Save preamble',
    faqTitle: 'FAQ knowledge base',
    faqHint:
      'Each FAQ appears on the public FAQ page, in llms.txt and as FAQPage JSON-LD, ready for AI search to quote.',
    newFaq: 'New FAQ',
    editFaq: 'Edit FAQ',
    noFaqs: 'No FAQ yet',
    question: 'Question',
    answer: 'Answer',
    language: 'Language',
    scope: 'Scope',
    scopeGlobal: 'Site-wide',
    scopeProduct: 'Specific product',
    targetSlug: 'Product slug',
    keywords: 'Trigger keywords (comma separated, optional)',
    keywordsHint: 'Helps AI search engines associate related questions with this answer.',
    addFaq: 'Add FAQ',
    saveFaq: 'Save FAQ',
    allLocales: 'All languages',
    geoAudit: 'GEO Health Check',
    geoAuditIntro:
      'Six weighted dimensions show how well AI search engines can understand this site right now, with a concrete fix for every gap.',
    geoAuditGrade: 'Overall grade',
    geoAuditRun: 'Run audit',
    geoAuditRunning: 'Auditing…',
    geoScore: 'Score',
    geoFactTitle: 'Entity facts',
    geoFactHint:
      'Only record facts an AI can verify: positioning, categories, shipping origin, payment. Automatically fed into llms.txt, llms-full.txt and Organization structured data.',
    geoFactNew: 'New fact',
    geoFactEdit: 'Edit fact',
    geoNoFacts: 'No entity facts yet (built-in templates are used as fallback)',
    geoFactLabel: 'Label',
    geoFactValue: 'Value',
    geoFactKind: 'Kind',
    pushAll: 'Push all via IndexNow',
    pushResult: 'Push result',
    indexnowKey: 'IndexNow key',
    companyInfo: 'Company info',
    socialLinks: 'SameAs profiles',
    baiduVerification: 'Baidu verification',
    sogouVerification: 'Sogou verification',
  },
};

export const dictionaries: Record<Locale, Dict> = { ko, zh, en };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale] ?? ko;
}
