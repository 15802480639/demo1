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
  inviteCodeLabel: string;
  inviteCodePh: string;
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
    chatSupport: string;
  };
  common: {
    addToCart: string;
    buyNow: string;
    /** 韩语页的主购买按钮：跳 Kakao 咨询 */
    kakaoConsult: string;
    /** 中文/英文页的次要入口：跳 Kakao 咨询 */
    kakaoConsultAlt: string;
    /** 结算页付款入口：跳转到 KakaoTalk 完成支付/咨询 */
    payViaKakao: string;
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
  // 邀请码
  inviteTitle: string;
  inviteDesc: string;
  inviteCodeLabel: string;
  copyBtn: string;
  copied: string;
  inviteHint: string;
  uplineLabel: string;
  noUpline: string;
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
  referrals: string;
  referralsIntro: string;
  rfSearch: string;
  rfInviteCode: string;
  rfUpline: string;
  rfInvitees: string;
  rfNoUpline: string;
  rfNoInvitees: string;
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
  // 积分体系
  points: string;
  pointSettings: string;
  pointsIntro: string;
  pointsEnabled: string;
  pointsEarnPercent: string;
  pointsMinSpend: string;
  pointsPerKrw: string;
  pointsMaxUse: string;
  pointsEarnWays: string;
  pointsBalance: string;
  pointsHistory: string;
  pointsUsed: string;
  pointsEarned: string;
  pointsDiscount: string;
  pointsNone: string;
  adjustPoints: string;
  grantCoupon: string;
  myCoupons: string;
  myPoints: string;
  // 导航补充
  navConsultations: string;
  navNewsletter: string;
  amDefaultUser: string;
  // 商品页
  pIntro: string;
  pSearchPh: string;
  pAllCats: string;
  pAllStatus: string;
  pUnit: string;
  pSkuUnit: string;
  pGrantLabel: string;
  pEarnLabel: string;
  pEarnFixed: string;
  pEarnPercent: string;
  pEarnGlobal: string;
  pNoEarn: string;
  pUseYes: string;
  pUseNo: string;
  pEmpty: string;
  pNoMatch: string;
  pPrev: string;
  pNext: string;
  pPageInfo: string;
  pErrSpec: string;
  pErrBase: string;
  pNameKo: string;
  pNameZh: string;
  pGenderMen: string;
  pGenderWomen: string;
  pGenderUnisex: string;
  pPriceWon: string;
  pComparePrice: string;
  pPointsHint: string;
  pEarnToggle: string;
  pEarnType: string;
  pEarnTypePercent: string;
  pEarnTypeFixed: string;
  pEarnFixedLabel: string;
  pEarnPercentLabel: string;
  pEarnPhFixed: string;
  pEarnPhPercent: string;
  pUseToggle: string;
  pMaxUseLabel: string;
  pMaxUsePh: string;
  pMaxUseHint: string;
  pCouponTitle: string;
  pCouponHint: string;
  pCouponEmpty: string;
  pCouponPercent: string;
  pCouponFixed: string;
  pDescKo: string;
  pDescZh: string;
  pTags: string;
  pImages: string;
  pImagesPh: string;
  pUploading: string;
  pUploadTip: string;
  pImageSpec: string;
  pSpecTitle: string;
  pAddSpec: string;
  pSpecNameKo: string;
  pSpecNameZh: string;
  pDelSpec: string;
  pSpecValKo: string;
  pSpecValZh: string;
  pDelSpecVal: string;
  pAddSpecVal: string;
  pSpecEmpty: string;
  pSkuTitle: string;
  pGenSku: string;
  pAddSkuRow: string;
  pStockCol: string;
  pPriceCol: string;
  pSelectPh: string;
  pStockPh: string;
  pPricePh: string;
  pSkuEmpty: string;
  pLoading: string;
  // 订单页
  oIntro: string;
  oFilteringUser: string;
  oClearFilter: string;
  oSearchPh: string;
  oAllStatus: string;
  oContactedAny: string;
  oContactedYes: string;
  oContactedNo: string;
  oUnit: string;
  oLoading: string;
  oViewDetail: string;
  oPointsTip: string;
  oPointsUsedBadge: string;
  oPointsEarnedBadge: string;
  oMarkContacted: string;
  oMarkUncontacted: string;
  oContactedBadge: string;
  oUncontactedBadge: string;
  oTrackingPh: string;
  oCarrierPh: string;
  oSaving: string;
  oSaveLogistics: string;
  oItemsTitle: string;
  oColProduct: string;
  oColSpec: string;
  oColPrice: string;
  oColQty: string;
  oColSubtotal: string;
  oCouponLabel: string;
  oCouponUsed: string;
  oCouponNoneCode: string;
  oCouponUnused: string;
  oPointsLabel: string;
  oPointsUsedText: string;
  oPointsWorth: string;
  oEarnedLabel: string;
  oPointsNone: string;
  oGrantCouponLabel: string;
  oCouponRevoked: string;
  oCouponUsedTag: string;
  oSubtotalText: string;
  oDiscountText: string;
  oPointsDeductText: string;
  oShippingText: string;
  oFreeShipping: string;
  oPaidText: string;
  oAddressTitle: string;
  oNoAddress: string;
  oEmpty: string;
  oNoMatch: string;
  // 客户页
  cIntro: string;
  cSearchPh: string;
  cUnit: string;
  cLoading: string;
  cNoEmail: string;
  cJoinedAt: string;
  cSelfReg: string;
  cOrderUnit: string;
  cPointsTip: string;
  cPointsUnit: string;
  cAdjustTip: string;
  cAdjustBtn: string;
  cGrantTip: string;
  cOrdersLink: string;
  cEmpty: string;
  cNoMatch: string;
  cPickCoupon: string;
  cGranted: string;
  cGrantFailed: string;
  cPmBadAmount: string;
  cPmOk: string;
  cPmInvalid: string;
  cPmFailed: string;
  cPmCustomerLabel: string;
  cPmCurrent: string;
  cPmAmountLabel: string;
  cPmAmountPh: string;
  cPmReasonLabel: string;
  cPmReasonPh: string;
  cProcessing: string;
  cConfirm: string;
  cGrantHint: string;
  cGrantPickLabel: string;
  cPickPh: string;
  cDisabled: string;
  cNoCouponsYet: string;
  cGrantSubmit: string;
  // 内容页
  ctShipping: string;
  ctReturns: string;
  ctContact: string;
  ctPrivacy: string;
  ctTerms: string;
  ctIntro: string;
  ctHomeSection: string;
  ctHomeHint: string;
  ctLabelTitle: string;
  ctPhTitleKo: string;
  ctPhTitleZh: string;
  ctPhTitleEn: string;
  ctLabelBody: string;
  ctPhBodyKo: string;
  ctPhBodyZh: string;
  ctPhBodyEn: string;
  ctSaveHome: string;
  ctSaved: string;
  ctInfoSection: string;
  ctInfoHint: string;
  ctLangKo: string;
  ctLangZh: string;
  ctLangEn: string;
  ctPhInfoBody: string;
  ctSaveInfo: string;
  ctFooterSection: string;
  ctFooterHint: string;
  ctBrandName: string;
  ctDefaultJD: string;
  ctYoutube: string;
  ctInstagram: string;
  ctPhDefault: string;
  ctContactRow: string;
  ctPhContact: string;
  ctBrandIntro: string;
  ctPhBrandIntro: string;
  ctCopyright: string;
  ctPhCopyright: string;
  ctLinksSection: string;
  ctColN: string;
  ctColTitleKo: string;
  ctColTitleZh: string;
  ctPhColTitle: string;
  ctAddLink: string;
  ctTagKo: string;
  ctTagZh: string;
  ctPhTag: string;
  ctPhUrl: string;
  ctDel: string;
  ctSaveFooter: string;
  ctSavedRefresh: string;
  ctEventSection: string;
  ctEventIntro: string;
  ctNewEvent: string;
  ctEventLoading: string;
  ctEventBadge: string;
  ctEventEmpty: string;
  ctErrEventTitle: string;
  ctEventEdit: string;
  ctEventNew: string;
  ctEventTitleKo: string;
  ctEventTitleZh: string;
  ctEventSubKo: string;
  ctEventSubZh: string;
  ctEventBadgeLabel: string;
  ctEventLinkLabel: string;
  ctEventOrderLabel: string;
  ctEventStatusLabel: string;
   ctEventImageLabel: string;
   ctEventImageSpec: string;
   ctPageTitle: string;
   ctSaving: string;
   ctStatusLabel: string;
   ctPublished: string;
   ctDraft: string;
  // 订阅页
  langNameKo: string;
  langNameZh: string;
  langNameEn: string;
  nlSubjectRequired: string;
  nlBodyRequired: string;
  nlTestToRequired: string;
  nlNoSubs: string;
  nlConfirmSend: string;
  nlErrNoSubject: string;
  nlErrNoBody: string;
  nlErrInvalidTest: string;
  nlErrNoActive: string;
  nlErrExpired: string;
  nlErrForbidden: string;
  nlErrSend: string;
  nlDryRunPrefix: string;
  nlTestSent: string;
  nlDone: string;
  nlSentStats: string;
  nlFailedStats: string;
  nlNetworkErr: string;
  nlTitle: string;
  nlStats: string;
  nlDryModeTitle: string;
  nlDryModeBody: string;
  nlCompose: string;
  nlLangLabel: string;
  nlLangHint: string;
  nlSubjectLabel: string;
  nlSubjectPh: string;
  nlBodyLabel: string;
  nlBodyPh: string;
  nlTestLabel: string;
  nlTestPh: string;
  nlSending: string;
  nlSendTest: string;
  nlSendAll: string;
  nlSearchPh: string;
  nlLoading: string;
  nlActive: string;
  nlUnsubscribed: string;
  nlEmpty: string;
  nlNoMatch: string;
  nlHistory: string;
  nlKindTest: string;
  nlKindAll: string;
  nlTestOk: string;
  nlTestFail: string;
  nlStatsOk: string;
  nlDryTag: string;
  // 积分设置页
  ptIntro: string;
  ptOffHint: string;
  ptEarnSection: string;
  ptEarnHint: string;
  ptEarnExample: string;
  ptEarnOverride: string;
  ptUseSection: string;
  ptUseHint: string;
  ptMinSpendExample: string;
  ptRatioExample: string;
  ptMaxUseHint: string;
  ptPreview: string;
  ptPreviewMinSpend: string;
  ptPreviewRatio: string;
  ptPreviewMaxUse: string;
  ptPreviewEarn: string;
  ptSaved: string;
  ptSaveFailed: string;
  ptLoading: string;
  // SEO 页
  spSaveHint: string;
  spSubmitted: string;
  spGscTitle: string;
  spGscHint: string;
  spCompanyHint: string;
  spCompanyName: string;
  spCeo: string;
  spAddress: string;
  spEmail: string;
  spPhone: string;
  spBizNo: string;
  spKakaoTitle: string;
  spKakaoHint: string;
  spKakaoLabel: string;
  spKakaoStatus: string;
  spKakaoOn: string;
  spKakaoOff: string;
  spOgImagePh: string;
  spSameAsHint: string;
  spIndexNowTitle: string;
  spIndexNowHint: string;
  // 轮播页
  bnNoTitle: string;
  bnSizeHint: string;
  bnSuffixKo: string;
  bnSuffixZh: string;
  // 分类页
  catIntro: string;
  catLevel: string;
  catMeta: string;
  catEmpty: string;
  catErrInUse: string;
  catErrName: string;
  catEditTitle: string;
  catNewTitle: string;
  catNameKo: string;
  catNameZh: string;
  catSlug: string;
  catOrder: string;
  catParent: string;
  catNone: string;
  catDepthHint: string;
  // 品牌页
  brIntro: string;
  brMeta: string;
  brEmpty: string;
  brErrDelete: string;
  brErrName: string;
  brEditTitle: string;
  brNewTitle: string;
  brNameKo: string;
  brNameZh: string;
  brSlug: string;
  // 优惠券页
  cpLoading: string;
  cpLimitN: string;
  cpAllProducts: string;
  cpApplyProducts: string;
  cpSelected: string;
  cpClear: string;
  cpSearchPh: string;
  cpProductsLoading: string;
  // 咨询页
  csNew: string;
  csContacted: string;
  csClosed: string;
  csTitle: string;
  csIntro: string;
  csAll: string;
  csNewCount: string;
  csContactedCount: string;
  csClosedCount: string;
  csLoading: string;
  csEmpty: string;
  csVisitorLang: string;
  csSource: string;
  csCopyOk: string;
  csCopy: string;
  csMarkContacted: string;
  csClose: string;
  csTip: string;
  // 实时客服（IM）
  imTitle: string;
  imStartTitle: string;
  imNamePh: string;
  imContactType: string;
  imContactEmail: string;
  imContactPhone: string;
  imContactNone: string;
  imContactPh: string;
  imStart: string;
  imInputPh: string;
  imSend: string;
  imAttach: string;
  imYou: string;
  imAdmin: string;
  imVisitor: string;
  imUnread: string;
  imMarkRead: string;
  imClose: string;
  imReopen: string;
  imClosed: string;
  imNoConversation: string;
  imSelectConv: string;
  imConnLost: string;
  imLeaveContact: string;
  imRetry: string;
  imUploading: string;
  imDesktopNotify: string;
  // GEO 组件
  gkCommonFaq: string;
  gkLoading: string;
  gkKindFact: string;
  gkKindClaim: string;
  gkKindDifferentiator: string;
  gkKindAudience: string;
  gkKindShipping: string;
  gkKindPayment: string;
  gkKindContact: string;
  gkShipTo: string;
  gkShipFrom: string;
  gkAdvice: string;
  ghEntity: string;
  ghSchema: string;
  ghContent: string;
  ghIndex: string;
  ghMulti: string;
  ghAuthority: string;
  ghEntityDesc: string;
  ghSchemaDesc: string;
  ghContentDesc: string;
  ghIndexDesc: string;
  ghMultiDesc: string;
  ghAuthorityDesc: string;
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
    inviteCodeLabel: '상위 초대코드',
    inviteCodePh: '초대받은 경우 입력 (선택)',
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
    chatSupport: '채팅 상담',
  },
  common: {
    addToCart: '장바구니 담기',
    buyNow: '바로구매',
    payViaKakao: '카카오톡으로 결제하기',
    kakaoConsult: 'Kakao 상담',
    kakaoConsultAlt: 'Kakao 상담하기',
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
    inviteTitle: '내 초대코드',
    inviteDesc: '아래 코드를 친구에게 공유하세요. 친구가 가입 시 이 코드를 입력하면 당신의 하위 회원이 됩니다.',
    inviteCodeLabel: '초대코드',
    copyBtn: '복사',
    copied: '복사됨',
    inviteHint: '코드 복사 후 카카오톡 등으로 공유',
    uplineLabel: '초대한 사람',
    noUpline: '직접 가입',
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
    referrals: '초대 관계',
    referralsIntro: '회원의 초대코드와 상위/하위 관계를 확인합니다.',
    rfSearch: '이름/이메일/초대코드 검색',
    rfInviteCode: '초대코드',
    rfUpline: '초대한 사람',
    rfInvitees: '직접 초대',
    rfNoUpline: '—',
    rfNoInvitees: '0',
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
    pushAll: 'IndexNow 전체 푸시',
    pushResult: '전송 결과',
    indexnowKey: 'IndexNow 키',
    companyInfo: '회사 정보',
    socialLinks: '동일 계정(SameAs)',
    baiduVerification: '바이두 인증코드',
    sogouVerification: '쑤거우 인증코드',
    points: '포인트',
    pointSettings: '포인트 설정',
    pointsIntro: '적립·사용 규칙을 여기서 설정합니다.',
    pointsEnabled: '포인트 시스템 사용',
    pointsEarnPercent: '구매 적립 비율(%)',
    pointsMinSpend: '포인트 사용 최소 주문 금액(₩)',
    pointsPerKrw: '포인트 환산 비율(포인트 = 1₩)',
    pointsMaxUse: '주문당 최대 사용 비율(%)',
    pointsEarnWays: '적립 방법',
    pointsBalance: '보유 포인트',
    pointsHistory: '포인트 내역',
    pointsUsed: '사용한 포인트',
    pointsEarned: '적립된 포인트',
    pointsDiscount: '포인트 할인 금액',
    pointsNone: '포인트 내역이 없습니다.',
    adjustPoints: '포인트 조정',
    grantCoupon: '쿠폰 지급',
    myCoupons: '내 쿠폰',
    myPoints: '내 포인트',
    navConsultations: 'Kakao 상담',
    navNewsletter: '뉴스레터 구독자',
    amDefaultUser: '관리자',
    pIntro: '상품은 「카테고리 관리」의 분류에 속하며, 「수정」을 눌러 규격(SKU) 관리, 이미지 업로드, 한중 이중 언어명 입력을 할 수 있습니다.',
    pSearchPh: '검색: 상품명 / 품번 / slug',
    pAllCats: '전체 카테고리',
    pAllStatus: '전체 상태',
    pUnit: '개 상품',
    pSkuUnit: '개 규격',
    pGrantLabel: '증정 쿠폰',
    pEarnLabel: '포인트:',
    pEarnFixed: '개당 {n}포인트 적립',
    pEarnPercent: '{n}% 적립',
    pEarnGlobal: '포인트 적립(전체 비율 적용)',
    pNoEarn: '포인트 적립 없음',
    pUseYes: '포인트 사용 가능',
    pUseNo: '포인트 사용 불가',
    pEmpty: '아직 상품이 없습니다. 오른쪽 위 「상품 추가」를 눌러 생성하세요.',
    pNoMatch: '필터 조건에 맞는 상품이 없습니다.',
    pPrev: '이전 페이지',
    pNext: '다음 페이지',
    pPageInfo: '{a} / {b} 페이지 · 총 {n}건',
    pErrSpec: '규격명과 규격값을 각각 하나 이상 입력해 주세요',
    pErrBase: '입력해 주세요: 상품명(한국어), 카테고리, 가격',
    pNameKo: '상품명(한국어) *',
    pNameZh: '상품명(중국어) — 중국어 페이지에 우선 표시',
    pGenderMen: '남성용',
    pGenderWomen: '여성용',
    pGenderUnisex: '공용',
    pPriceWon: '가격(₩) *',
    pComparePrice: '정가(₩)',
    pPointsHint: '이 상품의 「구매 시 포인트 적립 여부」와 「포인트 사용 가능 여부」를 설정합니다. 전체 기본값은 「포인트 설정」 페이지에 있습니다.',
    pEarnToggle: '이 상품 구매 시 포인트 적립',
    pEarnType: '적립 방식',
    pEarnTypePercent: '실결제 금액 비율',
    pEarnTypeFixed: '개당 고정 적립',
    pEarnFixedLabel: '개당 적립 포인트',
    pEarnPercentLabel: '적립 비율(%)',
    pEarnPhFixed: '예: 500',
    pEarnPhPercent: '비워두면 전체 비율 적용',
    pUseToggle: '이 상품에 포인트 사용 가능',
    pMaxUseLabel: '이 상품 건당 최대 사용 포인트',
    pMaxUsePh: '비워두면 별도 제한 없음',
    pMaxUseHint: '비워두면 전체 상한을 따릅니다(건당 주문 금액의 설정 비율까지).',
    pCouponTitle: '구매 시 쿠폰 증정',
    pCouponHint: '체크하면 고객이 이 상품을 구매하고 결제가 완료될 때 해당 쿠폰이 고객 계정의 「내 쿠폰」에 자동 발급됩니다. 체크 해제 = 증정하지 않음.',
    pCouponEmpty: '아직 생성된 쿠폰이 없습니다 — 「쿠폰」 페이지에서 먼저 생성한 뒤 이 페이지로 돌아와 체크하세요.',
    pCouponPercent: '{n}% 할인',
    pCouponFixed: '₩{n} 즉시 할인',
    pDescKo: '상품 설명(한국어)',
    pDescZh: '상품 설명(중국어)',
    pTags: '태그(영문 쉼표로 구분, 예: new, sale)',
    pImages: '상품 이미지(한 줄에 하나의 URL, 아래 버튼으로 업로드 가능)',
    pImagesPh: 'https://... 또는 /uploads/xxx.webp',
    pUploading: '업로드 중…',
    pUploadTip: 'Ctrl를 누른 채 여러 장을 한 번에 업로드할 수 있습니다',
    pImageSpec: '권장 크기 900×1200(3:4 세로), 첫 장이 대표 이미지; 장당 10MB 이하, jpg / png / webp 지원',
    pSpecTitle: '상품 규격(여러 개 추가 가능: 예 색상 / 사이즈 / 소재)',
    pAddSpec: '+ 규격 추가',
    pSpecNameKo: '규격명(한국어, 예 색상)',
    pSpecNameZh: '규격명(중국어, 예 颜色)',
    pDelSpec: '규격 삭제',
    pSpecValKo: '규격값(한국어, 예 레드)',
    pSpecValZh: '규격값(중국어, 예 红色)',
    pDelSpecVal: '해당 규격값 삭제',
    pAddSpecVal: '+ 규격값 추가',
    pSpecEmpty: '아직 규격이 없습니다. 「+ 규격 추가」를 눌러 여러 규격(색상, 사이즈, 소재…)을 추가할 수 있으며, 각 규격에는 여러 값을 넣을 수 있습니다.',
    pSkuTitle: '규격 조합 / 재고(SKU) — 추가, 수정, 삭제 가능',
    pGenSku: '규격으로 조합 일괄 생성',
    pAddSkuRow: '+ 수동으로 행 추가',
    pStockCol: '재고',
    pPriceCol: '가격',
    pSelectPh: '— 선택 —',
    pStockPh: '재고',
    pPricePh: '비워두면 상품 가격 적용',
    pSkuEmpty: '아직 조합이 없습니다 — 비워두면 상품은 통일 가격과 무제한 재고로 판매됩니다.',
    pLoading: '불러오는 중…',
    oIntro: '상태 드롭다운에서 바로 주문 상태를 변경할 수 있습니다. 「연락 완료」는 상담사 후속 조치 표시로, 아직 처리하지 않은 주문을 걸러 내는 데 쓰입니다.',
    oFilteringUser: '고객 <b>{name}</b>의 주문을 보고 있습니다({n}건)',
    oClearFilter: '✕ 필터 해제, 전체 보기',
    oSearchPh: '검색: 주문번호 / 고객 이메일 / 운송장번호',
    oAllStatus: '전체 상태',
    oContactedAny: '연락 완료 / 미연락',
    oContactedYes: '연락 완료만',
    oContactedNo: '미연락만',
    oUnit: '건',
    oLoading: '불러오는 중…',
    oViewDetail: '눌러서 주문 상세 보기',
    oPointsTip: '{a}포인트 사용 → {b}₩ 할인 · {c}포인트 증정',
    oPointsUsedBadge: '포인트 -{n}',
    oPointsEarnedBadge: '적립 +{n}',
    oMarkContacted: '눌러서 미연락으로 표시',
    oMarkUncontacted: '눌러서 연락 완료로 표시',
    oContactedBadge: '✓ 연락 완료',
    oUncontactedBadge: '미연락',
    oTrackingPh: '운송장번호',
    oCarrierPh: '택배사',
    oSaving: '저장 중…',
    oSaveLogistics: '배송정보 저장',
    oItemsTitle: '상품 명세',
    oColProduct: '상품',
    oColSpec: '규격(사이즈/색상)',
    oColPrice: '단가',
    oColQty: '수량',
    oColSubtotal: '소계',
    oCouponLabel: '쿠폰:',
    oCouponUsed: '사용됨',
    oCouponNoneCode: '할인 -{n}(쿠폰코드 없음)',
    oCouponUnused: '미사용',
    oPointsLabel: '포인트 사용:',
    oPointsUsedText: '{n}포인트 사용',
    oEarnedLabel: '본 주문 증정 포인트:',
    oPointsWorth: '현금 가치',
    oPointsNone: '없음',
    oGrantCouponLabel: '본 주문 증정 쿠폰:',
    oCouponRevoked: '(회수됨)',
    oCouponUsedTag: '(사용됨)',
    oSubtotalText: '소계 {n}',
    oDiscountText: ' · 할인 -{n}',
    oPointsDeductText: ' · 포인트 차감 -{n}',
    oShippingText: ' · 배송비 {n}',
    oFreeShipping: '무료배송',
    oPaidText: ' · 실결제 {n}',
    oAddressTitle: '배송 주소',
    oNoAddress: '(이 주문에는 저장된 주소 스냅샷이 없습니다)',
    oEmpty: '주문이 없습니다.',
    oNoMatch: '필터 조건에 맞는 주문이 없습니다.',
    cIntro: '고객 이메일이나 닉네임으로 검색하고, 「주문 관리」를 눌러 해당 고객의 주문 목록과 상세를 확인하세요. 포인트 옆 「✎ 조정」으로 수동 증감이 가능하고, 「쿠폰 지급」으로 고객 계정에 바로 쿠폰을 보낼 수 있습니다.',
    cSearchPh: '검색: 이메일 / 닉네임',
    cUnit: '명의 고객',
    cLoading: '불러오는 중…',
    cNoEmail: '이메일 없음',
    cJoinedAt: '{d} 가입',
    cSelfReg: '직접 가입',
    cOrderUnit: '건',
    cPointsTip: '눌러서 포인트 수동 증감',
    cPointsUnit: '포인트',
    cAdjustTip: '포인트 수동 추가 또는 차감',
    cAdjustBtn: '✎ 조정',
    cGrantTip: '이 고객에게 쿠폰 지급',
    cOrdersLink: '주문 관리 →',
    cEmpty: '고객이 없습니다.',
    cNoMatch: '검색 조건에 맞는 고객이 없습니다.',
    cPickCoupon: '지급할 쿠폰을 선택해 주세요',
    cGranted: '✓ {code} 지급 완료, 고객은 「내 쿠폰」에서 확인할 수 있습니다',
    cGrantFailed: '지급 실패, 다시 시도해 주세요',
    cPmBadAmount: '0이 아닌 정수를 입력해 주세요(양수는 증가, 음수는 차감)',
    cPmOk: '✓ 성공, 현재 포인트 {n}',
    cPmInvalid: '유효한 정수를 입력해 주세요',
    cPmFailed: '작업 실패, 다시 시도해 주세요',
    cPmCustomerLabel: '고객:',
    cPmCurrent: '현재 포인트:',
    cPmAmountLabel: '변동 수량(양수 증가, 음수 차감)',
    cPmAmountPh: '예: 1000 또는 -500',
    cPmReasonLabel: '사유 메모',
    cPmReasonPh: '예: A/S 보상 / 이벤트 증정',
    cProcessing: '처리 중…',
    cConfirm: '확인',
    cGrantHint: '지급 후 고객은 「내 계정 → 내 쿠폰」에서 볼 수 있으며, 결제 시 쿠폰코드를 입력해 사용합니다.',
    cGrantPickLabel: '쿠폰 선택',
    cPickPh: '— 선택해 주세요 —',
    cDisabled: ' · 중지됨',
    cNoCouponsYet: '아직 쿠폰이 없습니다. 「쿠폰 관리」에서 먼저 생성해 주세요.',
    cGrantSubmit: '지급 확인',
    ctShipping: '배송 정책(/info/shipping)',
    ctReturns: '반품·교환 정책(/info/returns)',
    ctContact: '문의하기(/info/contact)',
    ctPrivacy: '개인정보 처리방침(/info/privacy)',
    ctTerms: '이용약관(/info/terms)',
    ctIntro: '여기서 프론트 페이지에 바로 노출되는 문구와 이벤트 콘텐츠를 관리합니다. 저장 후 프론트를 새로고침하면 반영됩니다.',
    ctHomeSection: '홈 소개 문구',
    ctHomeHint: '홈 중간의 「프리미엄 골프웨어 쇼핑몰」 문구입니다. 세 언어로 각각 입력할 수 있으며, 비워두면 해당 언어의 기본 문구가 표시됩니다.',
    ctLabelTitle: '제목',
    ctPhTitleKo: '한국어 제목(비워두면 기본)',
    ctPhTitleZh: '중국어 제목(비워두면 기본)',
    ctPhTitleEn: '영어 제목(비워두면 기본)',
    ctLabelBody: '본문',
    ctPhBodyKo: '한국어 본문(비워두면 기본)',
    ctPhBodyZh: '중국어 본문(비워두면 기본)',
    ctPhBodyEn: '영어 본문(비워두면 기본)',
    ctSaveHome: '소개 문구 저장',
    ctSaved: '✓ 저장됨',
    ctInfoSection: '페이지 본문(약관 및 정책)',
    ctInfoHint: '푸터의 「고객 서비스」「약관 및 정책」에서 들어가는 페이지 내용은 모두 여기서 입력합니다. 각 페이지는 한국어 / 중국어 / 영어 세 가지 버전이며, 빈 줄은 문단 구분입니다. 입력하지 않은 버전은 프론트에 기본 문구가 표시됩니다. 저장 후 프론트 새로고침 시 즉시 반영됩니다.',
    ctLangKo: '한국어',
    ctLangZh: '중국어',
    ctLangEn: '영어',
    ctPhInfoBody: '{name} · {lang} 본문(비워두면 기본 표시)',
    ctSaveInfo: '페이지 본문 저장',
    ctFooterSection: '푸터 관리',
    ctFooterHint: '사이트 최하단 검은 영역의 모든 내용을 여기서 수정합니다. 텍스트는 한국어 / 중국어 두 버전으로 입력하며, 비워두면 해당 버전의 기본값을 씁니다. 링크 주소(URL)는 언어 구분 없이 한 번만 입력하면 됩니다.',
    ctBrandName: '브랜드명',
    ctDefaultJD: '기본: J&D',
    ctYoutube: 'YouTube 링크',
    ctInstagram: 'Instagram 링크',
    ctPhDefault: '기본: 사이트 설정 읽기',
    ctContactRow: '연락처 문구',
    ctPhContact: '기본: cs@jand.golf · 전화',
    ctBrandIntro: '브랜드 소개',
    ctPhBrandIntro: '기본: J&D는 합리적인 가격에 남녀 골프웨어, 아우터, 니트, 모자, 가방 등 프리미엄 골프 패션을 제공합니다…',
    ctCopyright: '저작권 문구',
    ctPhCopyright: '기본: 저작권 소유 J&D — 2026 J&D — 모든 권리 보유',
    ctLinksSection: '링크 칼럼(기본 3칼럼, 제목과 라벨은 한국어/중국어 각각 입력, 비워두면 기본)',
    ctColN: '제 {n}칼럼',
    ctColTitleKo: '칼럼 제목 · 한국어',
    ctColTitleZh: '칼럼 제목 · 중국어',
    ctPhColTitle: '기본: 브랜드 소개',
    ctAddLink: '+ 링크',
    ctTagKo: '라벨 · 한국어',
    ctTagZh: '라벨 · 중국어',
    ctPhTag: '예: 브랜드',
    ctPhUrl: '주소(언어 구분 없음), 예: /brands',
    ctDel: '삭제',
    ctSaveFooter: '푸터 저장',
    ctSavedRefresh: '✓ 저장됨, 프론트 새로고침 시 반영',
    ctEventSection: '이벤트 페이지',
    ctEventIntro: '「이벤트」 페이지의 내용을 여기서 관리합니다. 한국어 + 중국어 이중 언어, 이미지, 이동 링크를 지원합니다.',
    ctNewEvent: '+ 새 이벤트',
    ctEventLoading: '불러오는 중…',
    ctEventBadge: ' · 배지 {b}',
    ctEventEmpty: '아직 이벤트가 없습니다 — 프론트 「이벤트」 페이지에 기본 문구가 표시됩니다. 「새 이벤트」를 눌러 첫 항목을 추가하세요.',
    ctErrEventTitle: '이벤트 제목(한국어)을 입력해 주세요',
    ctEventEdit: '이벤트 수정',
    ctEventNew: '새 이벤트',
    ctEventTitleKo: '제목(한국어) *',
    ctEventTitleZh: '제목(중국어)',
    ctEventSubKo: '부제(한국어)',
    ctEventSubZh: '부제(중국어)',
    ctEventBadgeLabel: '배지(예: LIVE / NEW)',
    ctEventLinkLabel: '이동 링크(선택)',
    ctEventOrderLabel: '정렬(작은 순)',
    ctEventStatusLabel: '상태',
    ctEventImageLabel: '이미지(선택)',
    ctEventImageSpec: '권장 크기 1200×630(가로, 이벤트 카드 상단 표시); 장당 10MB 이하',
    ctPageTitle: '페이지 내용',
    ctSaving: '저장 중…',
    ctStatusLabel: '상태',
    ctPublished: '게시됨',
    ctDraft: '초안',
    langNameKo: '한국어',
    langNameZh: '中文',
    langNameEn: 'English',
    nlSubjectRequired: '메일 제목을 입력해 주세요',
    nlBodyRequired: '메일 본문을 입력해 주세요',
    nlTestToRequired: '테스트 수신 이메일을 입력해 주세요',
    nlNoSubs: '현재 유효한 구독자가 없어 일괄 발송할 수 없습니다',
    nlConfirmSend: '유효 구독자 {n}명에게 이 메일을 일괄 발송합니다.\n\n발송 후 취소할 수 없습니다. 계속하시겠습니까?',
    nlErrNoSubject: '제목 누락',
    nlErrNoBody: '본문 누락',
    nlErrInvalidTest: '테스트 이메일 형식이 올바르지 않습니다',
    nlErrNoActive: '유효한 구독자가 없습니다',
    nlErrExpired: '로그인이 만료되었습니다. 다시 로그인해 주세요',
    nlErrForbidden: '권한 없음',
    nlErrSend: '발송 실패: {e}',
    nlDryRunPrefix: '【시뮬레이션 모드, 실제 발송되지 않음】',
    nlTestSent: '테스트 메일 발송 완료',
    nlDone: '일괄 발송 완료',
    nlSentStats: ': 성공 {s}통',
    nlFailedStats: ', 실패 {f}통',
    nlNetworkErr: '네트워크 오류, 다시 시도해 주세요',
    nlTitle: '구독자 목록',
    nlStats: '총 <b className="text-ink">{t}</b>명 구독 · 유효 <b className="text-ink">{a}</b>명',
    nlDryModeTitle: '현재 시뮬레이션 모드',
    nlDryModeBody: ': 서버에 RESEND_API_KEY가 설정되지 않아, 발송을 눌러도 메일 내용이 로그에만 기록되고 <b>실제로는 발송되지 않습니다</b>. 템플릿, 수신거부, 통계는 모두 정상 검증 가능하며, key를 입력하고 재시작하면 자동으로 실제 발송으로 전환됩니다.',
    nlCompose: '뉴스레터 작성',
    nlLangLabel: '메일 언어',
    nlLangHint: '(하단 수신거부 문구가 함께 변경됩니다; 본문 내용은 해당 언어로 직접 작성해 주세요)',
    nlSubjectLabel: '제목',
    nlSubjectPh: '예: J&D 겨울 신상 출시 /全新 컬렉션 공개',
    nlBodyLabel: '본문(빈 줄로 문단 구분)',
    nlBodyPh: '첫 문단: 인사\n\n둘째 문단: 신상 소개\n\n셋째 문단: 사이트 구매 유도',
    nlTestLabel: '먼저 테스트 발송(강력 권장)',
    nlTestPh: '본인 이메일 — 서식을 확인한 뒤 일괄 발송하세요',
    nlSending: '발송 중…',
    nlSendTest: '테스트 메일 발송',
    nlSendAll: '{n}명에게 일괄 발송',
    nlSearchPh: '이메일 검색',
    nlLoading: '불러오는 중…',
    nlActive: '유효',
    nlUnsubscribed: '수신거부',
    nlEmpty: '구독자가 없습니다. 방문자가 프론트 홈 하단 「뉴스레터 구독」에 이메일을 입력하면 여기에 표시됩니다.',
    nlNoMatch: '일치하는 이메일이 없습니다.',
    nlHistory: '발송 기록',
    nlKindTest: '테스트',
    nlKindAll: '일괄 발송',
    nlTestOk: '발송됨',
    nlTestFail: '실패',
    nlStatsOk: '{s}/{r} 성공',
    nlDryTag: '시뮬레이션',
    ptIntro: '여기서 전역 포인트 규칙을 설정합니다. 개별 상품은 「상품 관리」에서 적립 비율과 포인트 사용 가능 여부를 별도로 덮어쓸 수 있습니다.',
    ptOffHint: '끄면: 프론트에 포인트 메뉴가 표시되지 않고, 사용자는 포인트로 차감할 수 없으며, 기존 잔액은 유지됩니다(초기화되지 않음).',
    ptEarnSection: '1. 포인트 적립 방법',
    ptEarnHint: '사용자는 상품 구매 후 포인트를 적립합니다. 기본적으로 「실결제 금액」의 백분율로 계산됩니다(실결제 = 주문 합계 − 쿠폰 − 포인트 차감).',
    ptEarnExample: '예: 5로 설정하면 사용자가 100,000₩ 실결제 시 5,000포인트를 적립합니다.',
    ptEarnOverride: '상품에 별도 비율을 설정할 수 있으며, 상품에 설정이 없으면 여기의 기본값을 씁니다.',
    ptUseSection: '2. 포인트 사용 방법',
    ptUseHint: '사용자는 결제 페이지에서 사용할 포인트 수를 입력하면, 자동으로 금액으로 환산되어 주문에서 차감됩니다.',
    ptMinSpendExample: '예: 50000으로 설정하면 주문 실결제가 50,000₩ 이상일 때만 포인트 사용을 선택할 수 있습니다.',
    ptRatioExample: '예: 100으로 설정하면 100포인트 = 1₩, 10,000포인트 = 100₩. 수치가 작을수록 포인트의 가치가 높아집니다.',
    ptMaxUseHint: '사용자가 한 번에 포인트를 모두 쓰는 것을 방지합니다. 30으로 설정하면 건당 최대 주문 금액의 30%까지 차감됩니다.',
    ptPreview: '규칙 미리보기',
    ptPreviewMinSpend: '주문 실결제 <b className="text-ink">{n}₩</b> 이상 시 포인트 사용 가능',
    ptPreviewRatio: '<b className="text-ink">{n}</b>포인트 = 1₩, 즉 1포인트 ≈ {v}₩',
    ptPreviewMaxUse: '건당 최대 주문 금액의 <b className="text-ink">{n}%</b>까지 차감',
    ptPreviewEarn: '실결제 10,000₩당 약 <b className="text-ink">{n}</b>포인트 적립',
    ptSaved: '✓ 저장됨, 프론트에 즉시 반영',
    ptSaveFailed: '저장 실패, 다시 시도해 주세요',
    ptLoading: '불러오는 중…',
    spSaveHint: '저장 즉시 반영되며, rebuild가 필요 없습니다. 비워두면 시스템 기본값을 씁니다.',
    spSubmitted: '✓ {a}/{b} 제출됨',
    spGscTitle: 'Search Console 인증',
    spGscHint: '저장 후 모든 페이지의 head에 즉시 출력됩니다. ⚠️ GSC는 반드시 「HTML 태그」 인증 방식을 선택해야 합니다. 본 사이트는 동적 라우트로 「HTML 파일」 방식에 적합하지 않습니다.',
    spCompanyHint: '⚠️ 강력 권장: 회사 법정명과 주소는 AI의 브랜드 엔티티 식별을 위한 핵심 근거입니다. \'—\' 또는 플레이스홀더 입력 시 프론트에서 자동 제거되며, 더러운 데이터로 엔티티를 오염시키지 않습니다.',
    spCompanyName: '회사 법정명',
    spCeo: 'CEO / 대표',
    spAddress: '회사 주소',
    spEmail: '연락 이메일',
    spPhone: '연락 전화',
    spBizNo: '사업자등록번호 / 법인등록번호',
    spKakaoTitle: 'Kakao 상담 링크(구매 채널)',
    spKakaoHint: '고객이 Kakao 플랫폼에서 채널을 만든 뒤 채팅 페이지 주소를 여기에 붙여넣습니다. 예: https://pf.kakao.com/_AbCdEf/chat . 입력하면 한국어 상품 페이지의 주 버튼이 「장바구니 담기」에서 「Kakao 상담」으로 바뀌고, 클릭 시 먼저 본 사이트에 상담 기록(상품명/규격/가격/언어)이 남은 뒤 Kakao로 이동합니다. 비워두면 기존 장바구니 버튼이 유지됩니다.',
    spKakaoLabel: 'Kakao 채널 채팅 링크',
    spKakaoStatus: '현재 상태:',
    spKakaoOn: '활성화됨 — 한국어 상품 페이지 주 버튼이 「Kakao 상담」',
    spKakaoOff: '미설정 — 「장바구니 / 바로 구매」 유지',
    spOgImagePh: 'https://…(권장 1200×630)',
    spSameAsHint: '공식 계정 링크는 Organization JSON-LD의 sameAs 필드로 출력됩니다 — 브랜드와 서드파티 계정을 연결하는 유일한 핵심 근거입니다. ⚠️ http(s)로 시작하는 실제 주소만 입력하세요. \'#\'는 자동 제거됩니다. 최소 2개 입력을 권장합니다.',
    spIndexNowTitle: 'IndexNow(즉시 색인)',
    spIndexNowHint: 'ChatGPT 온라인 검색은 주로 Bing 색인을 활용하며, IndexNow 푸시 후 Bing 계열이 몇 분 내로 재크롤링합니다. 8~128자의 영문/숫자/하이픈을 키로 입력하고, 동일 내용의 파일을 public/{key}.txt에 두어 공개 접근을 보장하세요.',
    bnNoTitle: '(제목 없음)',
    bnSizeHint: '권장 크기 1920×1080(16:9 가로, 홈 전체 슬라이드용); 장당 10MB 이하',
    bnSuffixKo: '(한국어/기본)',
    bnSuffixZh: '(중국어)',
    catIntro: '분류는 상품 관리의 상위 구조로, 최대 3단계(1차 → 2차 → 3차)를 지원합니다. 이름은 한국어 + 중국어 이중 언어를 지원합니다.',
    catLevel: '{n}단계',
    catMeta: '/{slug} · 정렬 {n} · 상품 {c}개',
    catEmpty: '분류가 없습니다. 오른쪽 위 「새 분류」를 눌러 생성하세요.',
    catErrInUse: '삭제 실패(분류가 사용 중일 수 있습니다)',
    catErrName: '분류명(한국어)을 입력해 주세요',
    catEditTitle: '분류 수정',
    catNewTitle: '새 분류',
    catNameKo: '이름(한국어) *',
    catNameZh: '이름(중국어)',
    catSlug: 'URL slug(비워두면 자동 생성)',
    catOrder: '정렬(작은 순)',
    catParent: '상위 분류(비워두면 1차 분류)',
    catNone: '— 없음(1차 분류)—',
    catDepthHint: '최대 3단계: 1차 분류 아래에 바로 하위를 만들 수 있고, 2차 분류 아래에도 한 단계 더 만들 수 있습니다.',
    brIntro: '브랜드명은 한국어 + 중국어 이중 언어를 지원합니다. 상품의 소속 브랜드는 「상품 관리」에서 선택합니다.',
    brMeta: '/{slug} · 상품 {n}개',
    brEmpty: '브랜드가 없습니다. 오른쪽 위 「새 브랜드」를 눌러 생성하세요.',
    brErrDelete: '삭제 실패',
    brErrName: '브랜드명(한국어)을 입력해 주세요',
    brEditTitle: '브랜드 수정',
    brNewTitle: '새 브랜드',
    brNameKo: '이름(한국어) *',
    brNameZh: '이름(중국어)',
    brSlug: 'URL slug(비워두면 자동 생성)',
    cpLoading: '불러오는 중…',
    cpLimitN: '{n}개 상품 한정',
    cpAllProducts: '전체 상품 공통',
    cpApplyProducts: '적용 상품(선택 해제 = 전체 상품 공통)',
    cpSelected: '{n}개 선택됨',
    cpClear: '비우기',
    cpSearchPh: '상품명 / 품번 검색',
    cpProductsLoading: '상품 불러오는 중…',
    csNew: '새 문의',
    csContacted: '연락 완료',
    csClosed: '종결',
    csTitle: 'Kakao 상담 기록',
    csIntro: '사용자가 「Kakao 상담 구매」를 누르면 본 사이트가 자동으로 기록합니다. 상담사가 Kakao에서 메시지를 받은 뒤, 여기서 상품 맥락을 확인하고 「답변 템플릿 복사」를 눌러 Kakao에 붙여넣으세요.',
    csAll: '전체 {n}',
    csNewCount: '새 문의 {n}',
    csContactedCount: '연락 완료 {n}',
    csClosedCount: '종결 {n}',
    csLoading: '불러오는 중…',
    csEmpty: '기록이 없습니다.',
    csVisitorLang: '방문자 언어: {l}',
    csSource: ' · 출처: {s}',
    csCopyOk: '✓ 복사됨',
    csCopy: '답변 템플릿 복사',
    csMarkContacted: '연락 완료로 표시',
    csClose: '종결',
    csTip: '팁: Kakao 상담 링크는 「SEO 설정」의 kakao.consultUrl에서 설정합니다. 미설정 시 프론트에 Kakao 메뉴가 표시되지 않습니다(기본 링크로 대체되지 않음).',
    imTitle: '실시간 상담',
    imStartTitle: '상담을 시작합니다',
    imNamePh: '이름(선택)',
    imContactType: '연락처 유형',
    imContactEmail: '이메일',
    imContactPhone: '전화',
    imContactNone: '미입력',
    imContactPh: '이메일 또는 전화번호(선택)',
    imStart: '대화 시작',
    imInputPh: '메시지를 입력하세요…',
    imSend: '전송',
    imAttach: '이미지',
    imYou: '나',
    imAdmin: '상담사',
    imVisitor: '방문자',
    imUnread: '{n}건 안읽음',
    imMarkRead: '읽음 처리',
    imClose: '상담 종료',
    imReopen: '재개',
    imClosed: '종료된 상담',
    imNoConversation: '상담 내역이 없습니다',
    imSelectConv: '왼쪽에서 상담을 선택하세요',
    imConnLost: '연결 끊김, 재연결 중…',
    imLeaveContact: '답변을 위해 연락처를 남겨주세요',
    imRetry: '다시 시도',
    imUploading: '업로드 중…',
    imDesktopNotify: '새 메시지 알림',
    gkCommonFaq: '자주 묻는 질문',
    gkLoading: '불러오는 중…',
    gkKindFact: '기본 사실',
    gkKindClaim: '브랜드 주장',
    gkKindDifferentiator: '차별화 포인트',
    gkKindAudience: '타겟 고객',
    gkKindShipping: '배송 정책',
    gkKindPayment: '결제 수단',
    gkKindContact: '연락처',
    gkShipTo: '배송지',
    gkShipFrom: '한국 출고',
    gkAdvice: '최소한 다음을 입력하는 것을 권장합니다: Founded / Business type / Product categories / Shipping origin / Payment / Returns policy. 이 내용은 llms.txt와 Organization 구조화 데이터에서 반복 인용됩니다.',
    ghEntity: '엔티티 명확도',
    ghSchema: '구조화 데이터',
    ghContent: '콘텐츠 인용성',
    ghIndex: '색인 채널',
    ghMulti: '다언어 커버리지',
    ghAuthority: '권위 신호',
    ghEntityDesc: 'AI가 「당신이 누구이고 어떤 회사인지」 확인할 수 있는지 — 모든 인용의 기반',
    ghSchemaDesc: '기계가 읽을 수 있는 구조화 데이터로, AI가 상품 정보를 직접 추출할 수 있는지 결정',
    ghContentDesc: '인용 가능한 충분한 텍스트 소재가 있는지',
    ghIndexDesc: 'AI가 당신을 찾을 수 있는 채널이 모두 열려 있는지',
    ghMultiDesc: '세 언어 사용자가 세 언어로 질문하므로, 답변도 언어별로 제공되어야 합니다',
    ghAuthorityDesc: '사이트 외부의 서드파티 합의 — 인용 가능한 상한을 결정하며, 가장 어렵지만 가장 핵심',
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
    inviteCodeLabel: '上级邀请码',
    inviteCodePh: '被邀请时填写（选填）',
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
    newArrivals: '新品上架',
    login: '登录',
    register: '注册',
    cart: '购物车',
    search: '搜索',
    account: '我的账户',
    wishlist: '收藏',
    chatSupport: '聊天客服',
  },
  common: {
    addToCart: '加入购物车',
    buyNow: '立即购买',
    payViaKakao: '通过 KakaoTalk 支付',
    kakaoConsult: 'Kakao 咨询',
    kakaoConsultAlt: 'Kakao 咨询购买',
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
    inviteTitle: '我的邀请码',
    inviteDesc: '把下面这串邀请码发给朋友，朋友注册时填你的码，就成为了你的下级。',
    inviteCodeLabel: '邀请码',
    copyBtn: '复制',
    copied: '已复制',
    inviteHint: '复制后通过 KakaoTalk 等发给朋友',
    uplineLabel: '邀请人',
    noUpline: '自主注册',
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
    referrals: '邀请关系',
    referralsIntro: '查看会员的邀请码与上级 / 下级关系。',
    rfSearch: '按名称/邮箱/邀请码搜索',
    rfInviteCode: '邀请码',
    rfUpline: '邀请人',
    rfInvitees: '直接邀请',
    rfNoUpline: '—',
    rfNoInvitees: '0',
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
    points: '积分',
    pointSettings: '积分设置',
    pointsIntro: '在这里设置积分的获得与使用规则。',
    pointsEnabled: '启用积分系统',
    pointsEarnPercent: '消费返积分比例（%）',
    pointsMinSpend: '使用积分的最低订单金额（₩）',
    pointsPerKrw: '积分兑换比例（多少积分抵 1₩）',
    pointsMaxUse: '单笔订单最多可抵比例（%）',
    pointsEarnWays: '积分获得途径',
    pointsBalance: '当前积分余额',
    pointsHistory: '积分明细',
    pointsUsed: '使用积分',
    pointsEarned: '获得积分',
    pointsDiscount: '积分抵扣金额',
    pointsNone: '暂无积分记录。',
    adjustPoints: '调整积分',
    grantCoupon: '发放优惠券',
    myCoupons: '我的优惠券',
    myPoints: '我的积分',
    navConsultations: 'Kakao 咨询',
    navNewsletter: '订阅列表',
    amDefaultUser: '管理员',
    pIntro: '商品挂在「分类管理」的分类下；点「编辑」可管理规格（SKU）、上传图片、填写中韩双语名称。',
    pSearchPh: '搜索：商品名 / 货号 / slug',
    pAllCats: '全部分类',
    pAllStatus: '全部状态',
    pUnit: '个商品',
    pSkuUnit: '个规格',
    pGrantLabel: '赠券',
    pEarnLabel: '积分：',
    pEarnFixed: '每件返 {n} 分',
    pEarnPercent: '返 {n}%',
    pEarnGlobal: '返积分（用全局比例）',
    pNoEarn: '不返积分',
    pUseYes: '可用积分抵扣',
    pUseNo: '不可用积分抵扣',
    pEmpty: '还没有商品，点右上角「新增商品」创建。',
    pNoMatch: '没有符合筛选条件的商品。',
    pPrev: '上一页',
    pNext: '下一页',
    pPageInfo: '第 {a} / {b} 页 · 共 {n} 条',
    pErrSpec: '请先填写至少一个规格名和它的规格值',
    pErrBase: '请填写：商品名（韩语）、分类、价格',
    pNameKo: '商品名（韩语）*',
    pNameZh: '商品名（中文）— 中文页面优先显示',
    pGenderMen: '男装',
    pGenderWomen: '女装',
    pGenderUnisex: '通用',
    pPriceWon: '价格（₩）*',
    pComparePrice: '划线价（₩）',
    pPointsHint: '控制这个商品「买完给不给积分」和「能不能用积分抵扣」。全局默认值在「积分设置」页。',
    pEarnToggle: '购买本商品可以获得积分',
    pEarnType: '返积分方式',
    pEarnTypePercent: '按实付金额百分比',
    pEarnTypeFixed: '按件固定返',
    pEarnFixedLabel: '每件返多少积分',
    pEarnPercentLabel: '返积分比例（%）',
    pEarnPhFixed: '如 500',
    pEarnPhPercent: '留空 = 用全局比例',
    pUseToggle: '本商品可以使用积分抵扣',
    pMaxUseLabel: '本商品单笔最多可用积分数',
    pMaxUsePh: '留空 = 不单独限制',
    pMaxUseHint: '留空表示跟随全局上限（单笔最多抵订单金额的设定百分比）。',
    pCouponTitle: '购买赠送优惠券',
    pCouponHint: '勾选后，客户购买本商品且订单支付成功，这张券会自动发到客户账户的「我的优惠券」里，结算时可直接用。不勾 = 不赠送。',
    pCouponEmpty: '还没有创建优惠券 —— 请先在「优惠券」页创建，再回到这里勾选。',
    pCouponPercent: '打折 {n}%',
    pCouponFixed: '立减 ₩{n}',
    pDescKo: '商品描述（韩语）',
    pDescZh: '商品描述（中文）',
    pTags: '标签（英文逗号分隔，如 new, sale）',
    pImages: '商品图（每行一个 URL，也可点下面按钮上传）',
    pImagesPh: 'https://... 或 /uploads/xxx.webp',
    pUploading: '上传中…',
    pUploadTip: '可按住 Ctrl 多选，一次传多张',
    pImageSpec: '建议尺寸 900×1200（3:4 竖图），第一张为主图；单张 ≤10MB，支持 jpg / png / webp',
    pSpecTitle: '商品规格（可添加多个：如 颜色 / 尺码 / 材质）',
    pAddSpec: '+ 添加规格',
    pSpecNameKo: '规格名（韩语，如 색상）',
    pSpecNameZh: '规格名（中文，如 颜色）',
    pDelSpec: '删除规格',
    pSpecValKo: '规格值（韩语，如 레드）',
    pSpecValZh: '规格值（中文，如 红色）',
    pDelSpecVal: '删除该规格值',
    pAddSpecVal: '+ 添加规格值',
    pSpecEmpty: '还没有规格。点「+ 添加规格」可添加多个规格（颜色、尺码、材质…），每个规格可有多个值。',
    pSkuTitle: '规格组合 / 库存（SKU）— 可添加、修改、删除',
    pGenSku: '按规格一键生成组合',
    pAddSkuRow: '+ 手动添加一行',
    pStockCol: '库存',
    pPriceCol: '价格',
    pSelectPh: '— 选择 —',
    pStockPh: '库存',
    pPricePh: '留空用商品价',
    pSkuEmpty: '还没有组合 — 不填的话商品按统一价格与无限库存售卖。',
    pLoading: '加载中…',
    oIntro: '状态下拉可直接改订单状态；「已联系」是客服跟进标记，方便筛出还没处理的单。',
    oFilteringUser: '正在查看客户 <b>{name}</b> 的订单（{n} 单）',
    oClearFilter: '✕ 清除筛选，查看全部',
    oSearchPh: '搜索：订单号 / 客户邮箱 / 运单号',
    oAllStatus: '全部状态',
    oContactedAny: '已联系 / 未联系',
    oContactedYes: '只看已联系',
    oContactedNo: '只看未联系',
    oUnit: '单',
    oLoading: '加载中…',
    oViewDetail: '点击查看订单详情',
    oPointsTip: '用 {a} 分抵扣 {b}₩ · 赠送 {c} 分',
    oPointsUsedBadge: '积分 -{n}',
    oPointsEarnedBadge: '返 +{n}',
    oMarkContacted: '点击标记为未联系',
    oMarkUncontacted: '点击标记为已联系',
    oContactedBadge: '✓ 已联系',
    oUncontactedBadge: '未联系',
    oTrackingPh: '运单号',
    oCarrierPh: '快递公司',
    oSaving: '保存中…',
    oSaveLogistics: '保存物流',
    oItemsTitle: '商品明细',
    oColProduct: '商品',
    oColSpec: '规格（尺码/颜色）',
    oColPrice: '单价',
    oColQty: '数量',
    oColSubtotal: '小计',
    oCouponLabel: '优惠券：',
    oCouponUsed: '已使用',
    oCouponNoneCode: '优惠 -{n}（无券码）',
    oCouponUnused: '未使用',
    oPointsLabel: '积分抵扣：',
    oPointsUsedText: '使用 {n} 分',
    oEarnedLabel: '本单赠送积分：',
    oPointsWorth: '抵现金',
    oPointsNone: '无',
    oGrantCouponLabel: '本单赠送优惠券：',
    oCouponRevoked: '（已收回）',
    oCouponUsedTag: '（已使用）',
    oSubtotalText: '小计 {n}',
    oDiscountText: ' · 优惠 -{n}',
    oPointsDeductText: ' · 积分抵扣 -{n}',
    oShippingText: ' · 运费 {n}',
    oFreeShipping: '免运费',
    oPaidText: ' · 实付 {n}',
    oAddressTitle: '收货地址',
    oNoAddress: '（该订单没有保存地址快照）',
    oEmpty: '暂无订单。',
    oNoMatch: '没有符合筛选条件的订单。',
    cIntro: '搜索客户邮箱或昵称，点「订单管理」查看该客户名下的订单列表和订单详情。点积分旁的「✎ 调整」可手动增减积分，点「发放优惠券」可直接送券到客户账户。',
    cSearchPh: '搜索：邮箱 / 昵称',
    cUnit: '位客户',
    cLoading: '加载中…',
    cNoEmail: '未留邮箱',
    cJoinedAt: '注册于 {d}',
    cSelfReg: '自主注册',
    cOrderUnit: '单',
    cPointsTip: '点击手动增减积分',
    cPointsUnit: '分',
    cAdjustTip: '手动增加或扣减积分',
    cAdjustBtn: '✎ 调整',
    cGrantTip: '给该客户发放优惠券',
    cOrdersLink: '订单管理 →',
    cEmpty: '暂无客户。',
    cNoMatch: '没有符合搜索条件的客户。',
    cPickCoupon: '请选择要发放的优惠券',
    cGranted: '✓ 已发放 {code}，用户可在「我的优惠券」查看',
    cGrantFailed: '发放失败，请重试',
    cPmBadAmount: '请输入非 0 的整数（正数增加、负数扣减）',
    cPmOk: '✓ 成功，当前积分 {n}',
    cPmInvalid: '请输入有效的整数',
    cPmFailed: '操作失败，请重试',
    cPmCustomerLabel: '客户：',
    cPmCurrent: '当前积分：',
    cPmAmountLabel: '变动数量（正数增加，负数扣减）',
    cPmAmountPh: '如 1000 或 -500',
    cPmReasonLabel: '备注原因',
    cPmReasonPh: '如：售后补偿 / 活动赠送',
    cProcessing: '处理中…',
    cConfirm: '确认',
    cGrantHint: '发放后用户可在「我的账户 → 我的优惠券」看到，结算时输入券码即可使用。',
    cGrantPickLabel: '选择优惠券',
    cPickPh: '— 请选择 —',
    cDisabled: ' · 已停用',
    cNoCouponsYet: '还没有优惠券，请先到「优惠券管理」创建。',
    cGrantSubmit: '确认发放',
    ctShipping: '配送政策（/info/shipping）',
    ctReturns: '退换货政策（/info/returns）',
    ctContact: '联系我们（/info/contact）',
    ctPrivacy: '隐私政策（/info/privacy）',
    ctTerms: '服务条款（/info/terms）',
    ctIntro: '这里管理前台页面上直接展示的文案和活动内容，改完刷新前台即可看到。',
    ctHomeSection: '首页介绍文案',
    ctHomeHint: '首页中部「高端高尔夫服饰商城」那一段文字。三种语言可分别填写；某语言留空则显示该语言默认文案。',
    ctLabelTitle: '标题',
    ctPhTitleKo: '韩语标题（留空用默认）',
    ctPhTitleZh: '中文标题（留空用默认）',
    ctPhTitleEn: '英语标题（留空用默认）',
    ctLabelBody: '正文',
    ctPhBodyKo: '韩语正文（留空用默认）',
    ctPhBodyZh: '中文正文（留空用默认）',
    ctPhBodyEn: '英语正文（留空用默认）',
    ctSaveHome: '保存介绍文案',
    ctSaved: '✓ 已保存',
    ctInfoSection: '页面正文（条款与政策）',
    ctInfoHint: '页脚「客户服务」「条款与政策」点进去的页面内容都在这里填。每个页面分韩文 / 中文 / 英文三套，空行即分段；哪套不填，前台就显示默认占位文案。保存后前台刷新即生效。',
    ctLangKo: '韩文',
    ctLangZh: '中文',
    ctLangEn: '英文',
    ctPhInfoBody: '{name} · {lang}正文（留空显示默认）',
    ctSaveInfo: '保存页面正文',
    ctFooterSection: '页脚管理',
    ctFooterHint: '网站最底部黑色区域的全部内容都在这里改。文字项分韩文 / 中文两套填写，哪套留空就用哪套的默认值；链接地址（URL）不分语言填一套即可。',
    ctBrandName: '品牌名',
    ctDefaultJD: '默认：J&D',
    ctYoutube: 'YouTube 链接',
    ctInstagram: 'Instagram 链接',
    ctPhDefault: '默认读取站点配置',
    ctContactRow: '联系信息行',
    ctPhContact: '默认：cs@jand.golf · 电话',
    ctBrandIntro: '品牌简介',
    ctPhBrandIntro: '默认：J&D 以合理的价格提供男女高尔夫服饰、外套、针织、帽子、包袋等高级高尔夫时尚…',
    ctCopyright: '版权行',
    ctPhCopyright: '默认：版权所有 J&D — 2026 J&D — 保留所有权利',
    ctLinksSection: '链接栏目（默认三栏，标题与标签均分韩/中填写，留空用默认）',
    ctColN: '第 {n} 栏',
    ctColTitleKo: '栏目标题 · 韩文',
    ctColTitleZh: '栏目标题 · 中文',
    ctPhColTitle: '默认：关于品牌',
    ctAddLink: '+ 链接',
    ctTagKo: '标签 · 韩文',
    ctTagZh: '标签 · 中文',
    ctPhTag: '例：品牌',
    ctPhUrl: '地址（不分语言），如 /brands',
    ctDel: '删',
    ctSaveFooter: '保存页脚',
    ctSavedRefresh: '✓ 已保存，刷新前台即可看到',
    ctEventSection: '活动页面',
    ctEventIntro: '「活动」页面的内容在这里维护，支持韩语 + 中文双语、配图和跳转链接。',
    ctNewEvent: '+ 新建活动',
    ctEventLoading: '加载中…',
    ctEventBadge: ' · 角标 {b}',
    ctEventEmpty: '还没有活动内容 — 前台「活动」页显示默认文案。点「新建活动」添加第一条。',
    ctErrEventTitle: '请填写活动标题（韩语）',
    ctEventEdit: '编辑活动',
    ctEventNew: '新建活动',
    ctEventTitleKo: '标题（韩语）*',
    ctEventTitleZh: '标题（中文）',
    ctEventSubKo: '副标题（韩语）',
    ctEventSubZh: '副标题（中文）',
    ctEventBadgeLabel: '角标（如 LIVE / NEW）',
    ctEventLinkLabel: '跳转链接（可选）',
    ctEventOrderLabel: '排序（小的在前）',
    ctEventStatusLabel: '状态',
    ctEventImageLabel: '配图（可选）',
    ctEventImageSpec: '建议尺寸 1200×630（横图，活动卡片顶部展示）；单张 ≤10MB',
    ctPageTitle: '页面内容',
    ctSaving: '保存中…',
    ctStatusLabel: '状态',
    ctPublished: '已上架',
    ctDraft: '草稿',
    langNameKo: '한국어',
    langNameZh: '中文',
    langNameEn: 'English',
    nlSubjectRequired: '请填写邮件主题',
    nlBodyRequired: '请填写邮件正文',
    nlTestToRequired: '请填写测试收件邮箱',
    nlNoSubs: '当前没有有效订阅者，无法群发',
    nlConfirmSend: '即将向 {n} 位有效订阅者群发本邮件。\n\n发送后无法撤回，确定继续吗？',
    nlErrNoSubject: '缺少主题',
    nlErrNoBody: '缺少正文',
    nlErrInvalidTest: '测试邮箱格式不对',
    nlErrNoActive: '没有有效订阅者',
    nlErrExpired: '登录已过期，请重新登录',
    nlErrForbidden: '无权限',
    nlErrSend: '发送失败：{e}',
    nlDryRunPrefix: '【演练模式，未真实发送】',
    nlTestSent: '测试邮件已发送',
    nlDone: '群发完成',
    nlSentStats: '：成功 {s} 封',
    nlFailedStats: '，失败 {f} 封',
    nlNetworkErr: '网络异常，请重试',
    nlTitle: '订阅列表',
    nlStats: '共 <b className="text-ink">{t}</b> 人订阅 · 有效 <b className="text-ink">{a}</b> 人',
    nlDryModeTitle: '当前为演练模式',
    nlDryModeBody: '：服务器尚未配置 RESEND_API_KEY，点击发送只会把邮件内容写进日志而<b>不会真实投递</b>。模板、退订、统计均可正常验证；填入 key 并重启后即自动切换为真实发送。',
    nlCompose: '写电子报',
    nlLangLabel: '邮件语种',
    nlLangHint: '（底部退订文案随之变化；正文内容请自行使用对应语种）',
    nlSubjectLabel: '主题',
    nlSubjectPh: '例：J&D 冬季新品上市 / 全新collection 공개',
    nlBodyLabel: '正文（空行分段）',
    nlBodyPh: '第一段：开场白\n\n第二段：新品介绍\n\n第三段：引导回网站选购',
    nlTestLabel: '先发测试（强烈建议）',
    nlTestPh: '你自己的邮箱，确认排版无误后再群发',
    nlSending: '发送中…',
    nlSendTest: '发送测试邮件',
    nlSendAll: '群发给 {n} 人',
    nlSearchPh: '搜索邮箱',
    nlLoading: '加载中…',
    nlActive: '有效',
    nlUnsubscribed: '已退订',
    nlEmpty: '暂无订阅。访客在前台首页底部「订阅电子报」填入邮箱后会出现在这里。',
    nlNoMatch: '没有匹配的邮箱。',
    nlHistory: '发信记录',
    nlKindTest: '测试',
    nlKindAll: '群发',
    nlTestOk: '已发',
    nlTestFail: '失败',
    nlStatsOk: '{s}/{r} 成功',
    nlDryTag: '演练',
    ptIntro: '这里设置全站统一的积分规则；单个商品可以在「商品管理」里单独覆盖返积分比例和是否可用积分抵扣。',
    ptOffHint: '关闭后：前台不显示积分入口，用户不能用积分抵扣，已有的积分余额保留不清零。',
    ptEarnSection: '一、怎么获得积分',
    ptEarnHint: '用户购买商品后获得积分。默认按「实付金额」的百分比计算（实付 = 订单总额 − 优惠券 − 积分抵扣）。',
    ptEarnExample: '例：设为 5，用户实付 100,000₩ 获得 5,000 积分。',
    ptEarnOverride: '商品可单独设置自己的比例，商品没设置时用这里的默认值。',
    ptUseSection: '二、怎么使用积分',
    ptUseHint: '用户在结算页输入想用的积分数，自动换算成金额从订单里扣掉。',
    ptMinSpendExample: '例：设为 50000，订单实付满 50,000₩ 才能勾选使用积分。',
    ptRatioExample: '例：设为 100，则 100 积分 = 1₩，10,000 积分 = 100₩。数值越小积分越值钱。',
    ptMaxUseHint: '防止用户一次性把积分全用光。设为 30 表示单笔最多抵订单金额的 30%。',
    ptPreview: '规则预览',
    ptPreviewMinSpend: '订单实付满 <b className="text-ink">{n}₩</b> 可用积分',
    ptPreviewRatio: '<b className="text-ink">{n}</b> 积分 = 1₩，即 1 积分 ≈ {v}₩',
    ptPreviewMaxUse: '单笔最多抵订单金额的 <b className="text-ink">{n}%</b>',
    ptPreviewEarn: '实付每 10,000₩ 约返 <b className="text-ink">{n}</b> 积分',
    ptSaved: '✓ 已保存，前台立即生效',
    ptSaveFailed: '保存失败，请重试',
    ptLoading: '加载中…',
    spSaveHint: '保存即生效，无需重新 build。留空则回落系统默认。',
    spSubmitted: '✓ {a}/{b} 已提交',
    spGscTitle: 'Search Console 验证',
    spGscHint: '保存后立刻输出到所有页面的 head。⚠️ GSC 必须选「HTML 标记」验证方式，本站有动态路由不适合「HTML 文件」方式。',
    spCompanyHint: '⚠️ 强烈建议填满：公司法定名称与地址是 AI 做品牌实体消歧的硬证据。留 \'—\' 或占位符时前台会自动剔除，绝不会输出脏数据污染实体。',
    spCompanyName: '公司法定名称',
    spCeo: 'CEO / 代表',
    spAddress: '公司地址',
    spEmail: '联系邮箱',
    spPhone: '联系电话',
    spBizNo: '营业执照 / 法人登记号',
    spKakaoTitle: 'Kakao 咨询链接（购买通道）',
    spKakaoHint: '客户在 Kakao 平台创建频道后，把聊天页地址粘到这里，形如 https://pf.kakao.com/_AbCdEf/chat 。填了之后韩语商品页的主按钮会从「加入购物车」变成「Kakao 상담」，点它会先在本站留一条咨询记录（商品名/规格/价格/语言），再跳转 Kakao。留空 = 保持原购物车按钮不变。',
    spKakaoLabel: 'Kakao 频道聊天链接',
    spKakaoStatus: '当前状态：',
    spKakaoOn: '已启用 —— 韩语商品页主按钮为「Kakao 상담」',
    spKakaoOff: '未配置 —— 保持「加入购物车 / 立即购买」',
    spOgImagePh: 'https://…（建议 1200×630）',
    spSameAsHint: '官方账号链接，会输出为 Organization JSON-LD 的 sameAs 字段 —— 这是把品牌与第三方账号绑定的唯一硬证据。⚠️ 只填 http(s) 开头的真实地址，填 \'#\' 会被自动剔除。至少填 2 个。',
    spIndexNowTitle: 'IndexNow（即时收录）',
    spIndexNowHint: 'ChatGPT 联网检索主要走 Bing 索引，IndexNow 推送后 Bing 系几分钟内重抓。填 8~128 位字母/数字/连字符作为密钥，另需把同内容文件放到 public/{key}.txt 保证公网可读。',
    bnNoTitle: '（无标题）',
    bnSizeHint: '建议尺寸 1920×1080（16:9 横图，首页全屏轮播用）；单张 ≤10MB',
    bnSuffixKo: '（韩语/默认）',
    bnSuffixZh: '(中文)',
    catIntro: '分类是商品管理的上层结构，支持最多 3 级（一级 → 二级 → 三级）。名称支持韩语 + 中文双语。',
    catLevel: '{n} 级',
    catMeta: '/{slug} · 排序 {n} · {c} 个商品',
    catEmpty: '暂无分类，点右上角「新建分类」创建。',
    catErrInUse: '删除失败（分类可能正在被使用）',
    catErrName: '请填写分类名称（韩语）',
    catEditTitle: '编辑分类',
    catNewTitle: '新建分类',
    catNameKo: '名称（韩语）*',
    catNameZh: '名称（中文）',
    catSlug: 'URL slug（留空自动生成）',
    catOrder: '排序（小的在前）',
    catParent: '上级分类（留空 = 一级分类）',
    catNone: '— 无（一级分类）—',
    catDepthHint: '最多 3 级：一级分类可直接建子级，二级分类下可再建一级子级。',
    brIntro: '品牌名称支持韩语 + 中文双语；商品在「商品管理」里选择所属品牌。',
    brMeta: '/{slug} · {n} 个商品',
    brEmpty: '暂无品牌，点右上角「新建品牌」创建。',
    brErrDelete: '删除失败',
    brErrName: '请填写品牌名称（韩语）',
    brEditTitle: '编辑品牌',
    brNewTitle: '新建品牌',
    brNameKo: '名称（韩语）*',
    brNameZh: '名称（中文）',
    brSlug: 'URL slug（留空自动生成）',
    cpLoading: '加载中…',
    cpLimitN: '限 {n} 件商品',
    cpAllProducts: '全场通用',
    cpApplyProducts: '适用商品（不勾选 = 全场通用）',
    cpSelected: '已选 {n} 件',
    cpClear: '清空',
    cpSearchPh: '搜索商品名 / 货号',
    cpProductsLoading: '商品加载中…',
    csNew: '新咨询',
    csContacted: '已联系',
    csClosed: '已关闭',
    csTitle: 'Kakao 咨询记录',
    csIntro: '用户点「Kakao 咨询购买」时本站会自动留档。客服在 Kakao 收到消息后，到这里查商品上下文，点「复制回复模板」粘到 Kakao 即可。',
    csAll: '全部 {n}',
    csNewCount: '新咨询 {n}',
    csContactedCount: '已联系 {n}',
    csClosedCount: '已关闭 {n}',
    csLoading: '加载中…',
    csEmpty: '暂无记录。',
    csVisitorLang: '访客语言: {l}',
    csSource: ' · 来源: {s}',
    csCopyOk: '✓ 已复制',
    csCopy: '复制回复模板',
    csMarkContacted: '标为已联系',
    csClose: '关闭',
    csTip: '提示：Kakao 咨询链接在「SEO 设置」里以 kakao.consultUrl 配置，未配置时前台不显示 Kakao 入口（不会回退到任何默认链接）。',
    imTitle: '实时客服',
    imStartTitle: '开始咨询',
    imNamePh: '称呼（选填）',
    imContactType: '联系方式',
    imContactEmail: '邮箱',
    imContactPhone: '电话',
    imContactNone: '不留存',
    imContactPh: '邮箱或手机号（选填）',
    imStart: '开始对话',
    imInputPh: '输入消息…',
    imSend: '发送',
    imAttach: '图片',
    imYou: '我',
    imAdmin: '客服',
    imVisitor: '访客',
    imUnread: '{n} 条未读',
    imMarkRead: '标为已读',
    imClose: '结束会话',
    imReopen: '重新打开',
    imClosed: '会话已结束',
    imNoConversation: '暂无会话',
    imSelectConv: '选择左侧会话开始回复',
    imConnLost: '连接中断，正在重连…',
    imLeaveContact: '为方便回复，可留下邮箱或电话',
    imRetry: '重试',
    imUploading: '上传中…',
    imDesktopNotify: '新消息提醒',
    gkCommonFaq: '常见问题',
    gkLoading: '加载中…',
    gkKindFact: '基本事实',
    gkKindClaim: '品牌主张',
    gkKindDifferentiator: '差异化卖点',
    gkKindAudience: '目标人群',
    gkKindShipping: '配送政策',
    gkKindPayment: '支付方式',
    gkKindContact: '联系方式',
    gkShipTo: '配送地',
    gkShipFrom: '从韩国发货',
    gkAdvice: '建议至少录入：Founded / Business type / Product categories / Shipping origin / Payment / Returns policy。这些会被 llms.txt 与 Organization 结构化数据反复引用。',
    ghEntity: '实体清晰度',
    ghSchema: '结构化数据',
    ghContent: '内容可引用性',
    ghIndex: '索引通道',
    ghMulti: '多语覆盖',
    ghAuthority: '权威信号',
    ghEntityDesc: 'AI 能不能确认「你是谁、你是哪家公司」——所有引用的地基',
    ghSchemaDesc: '机器可读的结构化数据，决定 AI 能否直接抽取商品信息',
    ghContentDesc: '有没有足够「可被引用」的文字素材',
    ghIndexDesc: '让 AI 能抓到你的通道是否全部打开',
    ghMultiDesc: '三种语言的用户问三种语言的问题，答案要分语种',
    ghAuthorityDesc: '站外第三方共识 —— 决定能被引用的上限，最难做但最关键',
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
    inviteCodeLabel: 'Referrer invite code',
    inviteCodePh: 'Enter if invited (optional)',
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
    chatSupport: 'Chat Support',
  },
  common: {
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    payViaKakao: 'Pay via KakaoTalk',
    kakaoConsult: 'Chat on Kakao',
    kakaoConsultAlt: 'Buy via Kakao',
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
    inviteTitle: 'My invite code',
    inviteDesc: 'Share this code with friends. When they register and enter it, they become your referral.',
    inviteCodeLabel: 'Invite code',
    copyBtn: 'Copy',
    copied: 'Copied',
    inviteHint: 'Copy and share via KakaoTalk etc.',
    uplineLabel: 'Invited by',
    noUpline: 'Signed up directly',
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
    referrals: 'Referrals',
    referralsIntro: 'View each member\'s invite code and upline/downline.',
    rfSearch: 'Search by name/email/invite code',
    rfInviteCode: 'Invite code',
    rfUpline: 'Invited by',
    rfInvitees: 'Direct invites',
    rfNoUpline: '—',
    rfNoInvitees: '0',
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
    points: 'Points',
    pointSettings: 'Point settings',
    pointsIntro: 'Configure how points are earned and redeemed here.',
    pointsEnabled: 'Enable points system',
    pointsEarnPercent: 'Earn rate on spend (%)',
    pointsMinSpend: 'Minimum order to use points (₩)',
    pointsPerKrw: 'Redemption rate (points per ₩1)',
    pointsMaxUse: 'Max redeemable per order (%)',
    pointsEarnWays: 'How to earn points',
    pointsBalance: 'Point balance',
    pointsHistory: 'Point history',
    pointsUsed: 'Points used',
    pointsEarned: 'Points earned',
    pointsDiscount: 'Points discount',
    pointsNone: 'No point activity yet.',
    adjustPoints: 'Adjust points',
    grantCoupon: 'Grant coupon',
    myCoupons: 'My coupons',
    myPoints: 'My points',
    navConsultations: 'Kakao Inquiry',
    navNewsletter: 'Subscribers',
    amDefaultUser: 'Administrator',
    pIntro: 'Products are organized under categories in Category Management. Click Edit to manage specs (SKU), upload images, and enter bilingual (KO/ZH) names.',
    pSearchPh: 'Search: name / code / slug',
    pAllCats: 'All categories',
    pAllStatus: 'All statuses',
    pUnit: 'products',
    pSkuUnit: 'specs',
    pGrantLabel: 'Coupon gift',
    pEarnLabel: 'Points:',
    pEarnFixed: '{n} pts per item',
    pEarnPercent: '{n}% back',
    pEarnGlobal: 'Earn points (global rate)',
    pNoEarn: 'No points',
    pUseYes: 'Points redeemable',
    pUseNo: 'Points not redeemable',
    pEmpty: 'No products yet. Click "New Product" in the top right to create one.',
    pNoMatch: 'No products match the current filters.',
    pPrev: 'Previous',
    pNext: 'Next',
    pPageInfo: 'Page {a} / {b} · {n} items',
    pErrSpec: 'Enter at least one spec name and its values',
    pErrBase: 'Required: name (Korean), category, price',
    pNameKo: 'Name (Korean) *',
    pNameZh: 'Name (Chinese) — shown first on Chinese pages',
    pGenderMen: 'Men',
    pGenderWomen: 'Women',
    pGenderUnisex: 'Unisex',
    pPriceWon: 'Price (₩) *',
    pComparePrice: 'Compare-at price (₩)',
    pPointsHint: 'Controls whether this product earns points and whether points can be redeemed on it. Global defaults live on the Points Settings page.',
    pEarnToggle: 'Earn points on this product',
    pEarnType: 'Earn method',
    pEarnTypePercent: 'Percent of paid amount',
    pEarnTypeFixed: 'Fixed per item',
    pEarnFixedLabel: 'Points per item',
    pEarnPercentLabel: 'Earn rate (%)',
    pEarnPhFixed: 'e.g. 500',
    pEarnPhPercent: 'Empty = use global rate',
    pUseToggle: 'Points redeemable on this product',
    pMaxUseLabel: 'Max points per order for this product',
    pMaxUsePh: 'Empty = no product-specific limit',
    pMaxUseHint: 'Empty follows the global cap (max percent of order amount).',
    pCouponTitle: 'Coupon gift on purchase',
    pCouponHint: 'When checked, this coupon is automatically issued to the customer account once the order is paid. Unchecked = no gift.',
    pCouponEmpty: 'No coupons yet — create one on the Coupons page first, then come back to select it.',
    pCouponPercent: '{n}% off',
    pCouponFixed: '₩{n} off',
    pDescKo: 'Description (Korean)',
    pDescZh: 'Description (Chinese)',
    pTags: 'Tags (comma-separated, e.g. new, sale)',
    pImages: 'Images (one URL per line, or upload below)',
    pImagesPh: 'https://... or /uploads/xxx.webp',
    pUploading: 'Uploading…',
    pUploadTip: 'Hold Ctrl to select and upload multiple at once',
    pImageSpec: 'Recommended 900×1200 (3:4 portrait); first image is the cover. Max 10MB each; jpg / png / webp.',
    pSpecTitle: 'Product specs (add multiple: e.g. Color / Size / Material)',
    pAddSpec: '+ Add spec',
    pSpecNameKo: 'Spec name (Korean, e.g. 색상)',
    pSpecNameZh: 'Spec name (Chinese, e.g. 颜色)',
    pDelSpec: 'Delete spec',
    pSpecValKo: 'Spec value (Korean, e.g. 레드)',
    pSpecValZh: 'Spec value (Chinese, e.g. 红色)',
    pDelSpecVal: 'Delete this value',
    pAddSpecVal: '+ Add value',
    pSpecEmpty: 'No specs yet. Click "+ Add spec" to add multiple specs (color, size, material…), each with multiple values.',
    pSkuTitle: 'Spec combinations / stock (SKU) — add, edit, delete',
    pGenSku: 'Generate combinations from specs',
    pAddSkuRow: '+ Add row manually',
    pStockCol: 'Stock',
    pPriceCol: 'Price',
    pSelectPh: '— Select —',
    pStockPh: 'Stock',
    pPricePh: 'Empty = use product price',
    pSkuEmpty: 'No combinations yet — when empty, the product sells at one price with unlimited stock.',
    pLoading: 'Loading…',
    oIntro: 'Use the status dropdown to change order status. "Contacted" is a service follow-up flag to filter out orders not yet handled.',
    oFilteringUser: 'Viewing orders for customer <b>{name}</b> ({n} orders)',
    oClearFilter: '✕ Clear filter, view all',
    oSearchPh: 'Search: order no. / customer email / tracking no.',
    oAllStatus: 'All statuses',
    oContactedAny: 'Contacted / Not contacted',
    oContactedYes: 'Contacted only',
    oContactedNo: 'Not contacted only',
    oUnit: 'orders',
    oLoading: 'Loading…',
    oViewDetail: 'Click to view order details',
    oPointsTip: '{a} pts redeem {b}₩ · {c} pts granted',
    oPointsUsedBadge: 'Points -{n}',
    oPointsEarnedBadge: 'Earned +{n}',
    oMarkContacted: 'Click to mark as not contacted',
    oMarkUncontacted: 'Click to mark as contacted',
    oContactedBadge: '✓ Contacted',
    oUncontactedBadge: 'Not contacted',
    oTrackingPh: 'Tracking number',
    oCarrierPh: 'Carrier',
    oSaving: 'Saving…',
    oSaveLogistics: 'Save shipping',
    oItemsTitle: 'Items',
    oColProduct: 'Product',
    oColSpec: 'Spec (size/color)',
    oColPrice: 'Unit price',
    oColQty: 'Qty',
    oColSubtotal: 'Subtotal',
    oCouponLabel: 'Coupon:',
    oCouponUsed: 'Used',
    oCouponNoneCode: 'Discount -{n} (no code)',
    oCouponUnused: 'Not used',
    oPointsLabel: 'Points redeemed:',
    oPointsUsedText: '{n} pts used',
    oEarnedLabel: 'Points granted this order:',
    oPointsWorth: 'worth',
    oPointsNone: 'None',
    oGrantCouponLabel: 'Coupons granted this order:',
    oCouponRevoked: '(revoked)',
    oCouponUsedTag: '(used)',
    oSubtotalText: 'Subtotal {n}',
    oDiscountText: ' · Discount -{n}',
    oPointsDeductText: ' · Points -{n}',
    oShippingText: ' · Shipping {n}',
    oFreeShipping: 'Free shipping',
    oPaidText: ' · Paid {n}',
    oAddressTitle: 'Shipping address',
    oNoAddress: '(No address snapshot saved for this order)',
    oEmpty: 'No orders yet.',
    oNoMatch: 'No orders match the current filters.',
    cIntro: 'Search customers by email or nickname. Click "Orders" to view their order list and details. Use "✎ Adjust" next to points to manually add or deduct, and "Grant coupon" to send a coupon straight to the account.',
    cSearchPh: 'Search: email / nickname',
    cUnit: 'customers',
    cLoading: 'Loading…',
    cNoEmail: 'No email',
    cJoinedAt: 'Joined {d}',
    cSelfReg: 'Self-registered',
    cOrderUnit: 'orders',
    cPointsTip: 'Click to manually adjust points',
    cPointsUnit: 'pts',
    cAdjustTip: 'Manually add or deduct points',
    cAdjustBtn: '✎ Adjust',
    cGrantTip: 'Grant a coupon to this customer',
    cOrdersLink: 'Orders →',
    cEmpty: 'No customers yet.',
    cNoMatch: 'No customers match the search.',
    cPickCoupon: 'Select a coupon to grant',
    cGranted: '✓ {code} granted — visible in "My Coupons"',
    cGrantFailed: 'Grant failed, please retry',
    cPmBadAmount: 'Enter a non-zero integer (positive to add, negative to deduct)',
    cPmOk: '✓ Success, current balance {n}',
    cPmInvalid: 'Enter a valid integer',
    cPmFailed: 'Operation failed, please retry',
    cPmCustomerLabel: 'Customer:',
    cPmCurrent: 'Current points:',
    cPmAmountLabel: 'Amount (positive to add, negative to deduct)',
    cPmAmountPh: 'e.g. 1000 or -500',
    cPmReasonLabel: 'Reason note',
    cPmReasonPh: 'e.g. service compensation / campaign gift',
    cProcessing: 'Processing…',
    cConfirm: 'Confirm',
    cGrantHint: 'After granting, the customer sees it under "My Account → My Coupons" and can enter the code at checkout.',
    cGrantPickLabel: 'Select coupon',
    cPickPh: '— Select —',
    cDisabled: ' · disabled',
    cNoCouponsYet: 'No coupons yet — create one in Coupon Management first.',
    cGrantSubmit: 'Grant',
    ctShipping: 'Shipping Policy (/info/shipping)',
    ctReturns: 'Returns & Exchanges (/info/returns)',
    ctContact: 'Contact Us (/info/contact)',
    ctPrivacy: 'Privacy Policy (/info/privacy)',
    ctTerms: 'Terms of Service (/info/terms)',
    ctIntro: 'Manage the copy and campaign content shown directly on the storefront. Refresh the storefront after saving to see changes.',
    ctHomeSection: 'Homepage intro copy',
    ctHomeHint: 'The "premium golfwear store" paragraph in the middle of the homepage. Fill each language separately; empty falls back to that language default.',
    ctLabelTitle: 'Title',
    ctPhTitleKo: 'Korean title (empty = default)',
    ctPhTitleZh: 'Chinese title (empty = default)',
    ctPhTitleEn: 'English title (empty = default)',
    ctLabelBody: 'Body',
    ctPhBodyKo: 'Korean body (empty = default)',
    ctPhBodyZh: 'Chinese body (empty = default)',
    ctPhBodyEn: 'English body (empty = default)',
    ctSaveHome: 'Save intro',
    ctSaved: '✓ Saved',
    ctInfoSection: 'Page body (terms & policies)',
    ctInfoHint: 'Content for the pages linked from the footer "Customer Service" and "Terms & Policies". Each page has Korean / Chinese / English versions; blank lines separate paragraphs. Unfilled versions show default placeholder copy. Takes effect on storefront refresh.',
    ctLangKo: 'Korean',
    ctLangZh: 'Chinese',
    ctLangEn: 'English',
    ctPhInfoBody: '{name} · {lang} body (empty = default)',
    ctSaveInfo: 'Save page body',
    ctFooterSection: 'Footer management',
    ctFooterHint: 'Everything in the black area at the very bottom of the site. Text fields take Korean / Chinese versions; empty uses that version default. Link URLs are language-independent — fill once.',
    ctBrandName: 'Brand name',
    ctDefaultJD: 'Default: J&D',
    ctYoutube: 'YouTube link',
    ctInstagram: 'Instagram link',
    ctPhDefault: 'Default: read from site config',
    ctContactRow: 'Contact line',
    ctPhContact: 'Default: cs@jand.golf · phone',
    ctBrandIntro: 'Brand intro',
    ctPhBrandIntro: 'Default: J&D offers premium golf fashion — men and women golfwear, outerwear, knits, caps, bags — at fair prices…',
    ctCopyright: 'Copyright line',
    ctPhCopyright: 'Default: Copyright J&D — 2026 J&D — All rights reserved',
    ctLinksSection: 'Link columns (default 3; titles and labels filled per KO/ZH, empty = default)',
    ctColN: 'Column {n}',
    ctColTitleKo: 'Column title · Korean',
    ctColTitleZh: 'Column title · Chinese',
    ctPhColTitle: 'Default: About the brand',
    ctAddLink: '+ Link',
    ctTagKo: 'Label · Korean',
    ctTagZh: 'Label · Chinese',
    ctPhTag: 'e.g. Brand',
    ctPhUrl: 'URL (language-independent), e.g. /brands',
    ctDel: 'Delete',
    ctSaveFooter: 'Save footer',
    ctSavedRefresh: '✓ Saved — refresh the storefront to see',
    ctEventSection: 'Events page',
    ctEventIntro: 'Maintain the Events page content here. Supports Korean + Chinese, images, and jump links.',
    ctNewEvent: '+ New event',
    ctEventLoading: 'Loading…',
    ctEventBadge: ' · badge {b}',
    ctEventEmpty: 'No events yet — the storefront Events page shows default copy. Click "New event" to add the first one.',
    ctErrEventTitle: 'Enter the event title (Korean)',
    ctEventEdit: 'Edit event',
    ctEventNew: 'New event',
    ctEventTitleKo: 'Title (Korean) *',
    ctEventTitleZh: 'Title (Chinese)',
    ctEventSubKo: 'Subtitle (Korean)',
    ctEventSubZh: 'Subtitle (Chinese)',
    ctEventBadgeLabel: 'Badge (e.g. LIVE / NEW)',
    ctEventLinkLabel: 'Jump link (optional)',
    ctEventOrderLabel: 'Order (small first)',
    ctEventStatusLabel: 'Status',
    ctEventImageLabel: 'Image (optional)',
    ctEventImageSpec: 'Recommended 1200×630 (landscape, top of event card); max 10MB',
    ctPageTitle: 'Page content',
    ctSaving: 'Saving…',
    ctStatusLabel: 'Status',
    ctPublished: 'Published',
    ctDraft: 'Draft',
    langNameKo: '한국어',
    langNameZh: '中文',
    langNameEn: 'English',
    nlSubjectRequired: 'Enter an email subject',
    nlBodyRequired: 'Enter the email body',
    nlTestToRequired: 'Enter a test recipient email',
    nlNoSubs: 'No active subscribers — cannot blast',
    nlConfirmSend: 'About to blast this email to {n} active subscribers.\n\nIt cannot be recalled after sending. Continue?',
    nlErrNoSubject: 'Missing subject',
    nlErrNoBody: 'Missing body',
    nlErrInvalidTest: 'Invalid test email format',
    nlErrNoActive: 'No active subscribers',
    nlErrExpired: 'Session expired, please sign in again',
    nlErrForbidden: 'Not authorized',
    nlErrSend: 'Send failed: {e}',
    nlDryRunPrefix: '[Dry run — not actually sent]',
    nlTestSent: 'Test email sent',
    nlDone: 'Blast complete',
    nlSentStats: ': {s} sent',
    nlFailedStats: ', {f} failed',
    nlNetworkErr: 'Network error, please retry',
    nlTitle: 'Subscribers',
    nlStats: '<b className="text-ink">{t}</b> subscribers · <b className="text-ink">{a}</b> active',
    nlDryModeTitle: 'Dry-run mode is on',
    nlDryModeBody: ': the server has no RESEND_API_KEY, so sending only writes the email to the log and <b>does not deliver</b>. Templates, unsubscribe, and stats can all be verified; add the key and restart to switch to real sending.',
    nlCompose: 'Compose newsletter',
    nlLangLabel: 'Email language',
    nlLangHint: '(the unsubscribe line at the bottom changes with it; write the body in the matching language)',
    nlSubjectLabel: 'Subject',
    nlSubjectPh: 'e.g. J&D winter launch /全新 collection 공개',
    nlBodyLabel: 'Body (blank lines split paragraphs)',
    nlBodyPh: 'Para 1: greeting\n\nPara 2: new arrivals\n\nPara 3: shop on the site',
    nlTestLabel: 'Send a test first (strongly recommended)',
    nlTestPh: 'Your own email — check formatting before blasting',
    nlSending: 'Sending…',
    nlSendTest: 'Send test email',
    nlSendAll: 'Blast to {n}',
    nlSearchPh: 'Search email',
    nlLoading: 'Loading…',
    nlActive: 'Active',
    nlUnsubscribed: 'Unsubscribed',
    nlEmpty: 'No subscribers. Visitors who enter their email in the homepage footer "Subscribe" box appear here.',
    nlNoMatch: 'No matching emails.',
    nlHistory: 'Send history',
    nlKindTest: 'Test',
    nlKindAll: 'Blast',
    nlTestOk: 'Sent',
    nlTestFail: 'Failed',
    nlStatsOk: '{s}/{r} sent',
    nlDryTag: 'Dry run',
    ptIntro: 'Set site-wide point rules here. Individual products can override the earn rate and redeemability in Product Management.',
    ptOffHint: 'When off: no points entry on the storefront, customers cannot redeem points, and existing balances are kept (not zeroed).',
    ptEarnSection: '1. How points are earned',
    ptEarnHint: 'Customers earn points after purchase. By default a percentage of the paid amount (paid = order total − coupon − points redeemed).',
    ptEarnExample: 'Example: set 5 — a 100,000₩ payment earns 5,000 points.',
    ptEarnOverride: 'Products can set their own rate; when unset, the default here applies.',
    ptUseSection: '2. How points are used',
    ptUseHint: 'At checkout the customer enters how many points to use; they are converted to an amount and deducted from the order.',
    ptMinSpendExample: 'Example: set 50000 — points can only be used when the paid amount reaches 50,000₩.',
    ptRatioExample: 'Example: set 100 — 100 points = ₩1, 10,000 points = ₩100. Smaller numbers make points more valuable.',
    ptMaxUseHint: 'Prevents spending all points at once. Set 30 for a max of 30% of the order amount per order.',
    ptPreview: 'Rule preview',
    ptPreviewMinSpend: 'Points usable when paid amount reaches <b className="text-ink">{n}₩</b>',
    ptPreviewRatio: '<b className="text-ink">{n}</b> points = ₩1, i.e. 1 point ≈ {v}₩',
    ptPreviewMaxUse: 'Max <b className="text-ink">{n}%</b> of order amount per order',
    ptPreviewEarn: 'About <b className="text-ink">{n}</b> points per 10,000₩ paid',
    ptSaved: '✓ Saved — live on the storefront immediately',
    ptSaveFailed: 'Save failed, please retry',
    ptLoading: 'Loading…',
    spSaveHint: 'Takes effect on save — no rebuild needed. Empty falls back to system defaults.',
    spSubmitted: '✓ {a}/{b} submitted',
    spGscTitle: 'Search Console verification',
    spGscHint: 'Outputs to every page head immediately after saving. ⚠️ GSC must use the "HTML tag" method — this site has dynamic routes, so the "HTML file" method does not fit.',
    spCompanyHint: '⚠️ Strongly recommended: the legal company name and address are hard evidence for AI brand-entity disambiguation. Placeholders like \'—\' are auto-stripped on the storefront and never pollute entity data.',
    spCompanyName: 'Legal company name',
    spCeo: 'CEO / Representative',
    spAddress: 'Company address',
    spEmail: 'Contact email',
    spPhone: 'Contact phone',
    spBizNo: 'Business registration no.',
    spKakaoTitle: 'Kakao inquiry link (purchase channel)',
    spKakaoHint: 'After the customer creates a channel on the Kakao platform, paste the chat page URL here, e.g. https://pf.kakao.com/_AbCdEf/chat . Once set, the Korean product page main button switches from "Add to cart" to "Kakao 상담"; clicking it first leaves an inquiry record on this site (product/spec/price/language), then redirects to Kakao. Leave empty to keep the original cart button.',
    spKakaoLabel: 'Kakao channel chat link',
    spKakaoStatus: 'Current status:',
    spKakaoOn: 'Enabled — the Korean product page main button shows 「Kakao 상담」',
    spKakaoOff: 'Not configured — keeps 「Add to cart / Buy now」',
    spOgImagePh: 'https://… (1200×630 recommended)',
    spSameAsHint: 'Official account links are output as the sameAs field of Organization JSON-LD — the only hard evidence tying the brand to third-party accounts. ⚠️ Only real http(s) URLs; \'#\' is auto-stripped. At least 2 recommended.',
    spIndexNowTitle: 'IndexNow (instant indexing)',
    spIndexNowHint: 'ChatGPT live search relies mainly on Bing indexing; after an IndexNow push, Bing-family engines re-crawl within minutes. Use an 8–128 char key (letters/digits/hyphens) and place an identical file at public/{key}.txt for public readability.',
    bnNoTitle: '(no title)',
    bnSizeHint: 'Recommended 1920×1080 (16:9 landscape, full-screen homepage carousel); max 10MB each',
    bnSuffixKo: '(Korean/default)',
    bnSuffixZh: '(Chinese)',
    catIntro: 'Categories are the top structure of product management, up to 3 levels (L1 → L2 → L3). Names support Korean + Chinese.',
    catLevel: 'Level {n}',
    catMeta: '/{slug} · order {n} · {c} products',
    catEmpty: 'No categories. Click "New category" in the top right to create one.',
    catErrInUse: 'Delete failed (category may be in use)',
    catErrName: 'Enter the category name (Korean)',
    catEditTitle: 'Edit category',
    catNewTitle: 'New category',
    catNameKo: 'Name (Korean) *',
    catNameZh: 'Name (Chinese)',
    catSlug: 'URL slug (empty = auto-generate)',
    catOrder: 'Order (small first)',
    catParent: 'Parent category (empty = top level)',
    catNone: '— None (top level) —',
    catDepthHint: 'Up to 3 levels: an L1 category can have children directly; an L2 category can have one more level.',
    brIntro: 'Brand names support Korean + Chinese. Products pick their brand in Product Management.',
    brMeta: '/{slug} · {n} products',
    brEmpty: 'No brands. Click "New brand" in the top right to create one.',
    brErrDelete: 'Delete failed',
    brErrName: 'Enter the brand name (Korean)',
    brEditTitle: 'Edit brand',
    brNewTitle: 'New brand',
    brNameKo: 'Name (Korean) *',
    brNameZh: 'Name (Chinese)',
    brSlug: 'URL slug (empty = auto-generate)',
    cpLoading: 'Loading…',
    cpLimitN: 'Limited to {n} products',
    cpAllProducts: 'All products',
    cpApplyProducts: 'Applicable products (none selected = all products)',
    cpSelected: '{n} selected',
    cpClear: 'Clear',
    cpSearchPh: 'Search product name / code',
    cpProductsLoading: 'Loading products…',
    csNew: 'New',
    csContacted: 'Contacted',
    csClosed: 'Closed',
    csTitle: 'Kakao inquiry log',
    csIntro: 'When a customer clicks "Kakao inquiry to buy", this site files it automatically. After receiving the Kakao message, check the product context here and paste it into Kakao via "Copy reply template".',
    csAll: 'All {n}',
    csNewCount: 'New {n}',
    csContactedCount: 'Contacted {n}',
    csClosedCount: 'Closed {n}',
    csLoading: 'Loading…',
    csEmpty: 'No records.',
    csVisitorLang: 'Visitor language: {l}',
    csSource: ' · source: {s}',
    csCopyOk: '✓ Copied',
    csCopy: 'Copy reply template',
    csMarkContacted: 'Mark contacted',
    csClose: 'Close',
    csTip: 'Tip: the Kakao inquiry link is configured as kakao.consultUrl in SEO Settings. When unset, the storefront shows no Kakao entry (no default fallback).',
    imTitle: 'Live Chat',
    imStartTitle: 'Start a conversation',
    imNamePh: 'Name (optional)',
    imContactType: 'Contact type',
    imContactEmail: 'Email',
    imContactPhone: 'Phone',
    imContactNone: 'No contact',
    imContactPh: 'Email or phone (optional)',
    imStart: 'Start chat',
    imInputPh: 'Type a message…',
    imSend: 'Send',
    imAttach: 'Image',
    imYou: 'You',
    imAdmin: 'Support',
    imVisitor: 'Visitor',
    imUnread: '{n} unread',
    imMarkRead: 'Mark read',
    imClose: 'Close chat',
    imReopen: 'Reopen',
    imClosed: 'Closed',
    imNoConversation: 'No conversations',
    imSelectConv: 'Select a conversation on the left',
    imConnLost: 'Connection lost, reconnecting…',
    imLeaveContact: 'Leave your email or phone so we can follow up',
    imRetry: 'Retry',
    imUploading: 'Uploading…',
    imDesktopNotify: 'New message',
    gkCommonFaq: 'FAQ',
    gkLoading: 'Loading…',
    gkKindFact: 'Fact',
    gkKindClaim: 'Brand claim',
    gkKindDifferentiator: 'Differentiator',
    gkKindAudience: 'Audience',
    gkKindShipping: 'Shipping',
    gkKindPayment: 'Payment',
    gkKindContact: 'Contact',
    gkShipTo: 'Ships to',
    gkShipFrom: 'Shipped from Korea',
    gkAdvice: 'Recommended minimum: Founded / Business type / Product categories / Shipping origin / Payment / Returns policy. These are referenced repeatedly by llms.txt and Organization structured data.',
    ghEntity: 'Entity clarity',
    ghSchema: 'Structured data',
    ghContent: 'Content citability',
    ghIndex: 'Indexing channels',
    ghMulti: 'Multilingual coverage',
    ghAuthority: 'Authority signals',
    ghEntityDesc: 'Can AI confirm who you are and which company you are — the foundation of every citation',
    ghSchemaDesc: 'Machine-readable structured data that decides whether AI can extract product info directly',
    ghContentDesc: 'Whether there is enough citable text material',
    ghIndexDesc: 'Whether every channel that lets AI find you is open',
    ghMultiDesc: 'Users ask in three languages, so answers must be language-specific',
    ghAuthorityDesc: 'Off-site third-party consensus — sets the ceiling of citability; hardest but most critical',
  },
};

export const dictionaries: Record<Locale, Dict> = { ko, zh, en };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale] ?? ko;
}
