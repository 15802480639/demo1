// H5 客服台专用文案字典（韩文）
//
// 为什么单独建一套？
//   /cs 是独立路由树，不在 [locale] 之下，拿不到商城的 getDictionary()。
//   客服团队全部是韩国人 → 客服台界面固定韩文，不做多语言切换。
//   访客侧（商城前台）的 IM 文案仍在 src/i18n/dictionaries.ts 里按 ko/zh/en 走，
//   两套互不干扰：这里只服务 /cs 下的页面与组件。
//
// ⚠️ 新增文案务必同时更新 CsDict 类型，避免漏项。

export type CsDict = {
  // 登录页
  loginTitle: string;
  loginSubtitle: string;
  loginAccountLabel: string;
  loginAccountPh: string;
  loginPasswordLabel: string;
  loginPasswordPh: string;
  loginSubmit: string;
  loginSubmitting: string;
  loginFooter: string;
  // 登录错误
  errMissingFields: string;
  errInvalidCredentials: string;
  errAgentDisabled: string;
  errServerError: string;
  errLoginFailed: string;
  // 工作台
  workbenchTitle: string;
  connOpen: string;
  connReconnecting: string;
  connLost: string;
  unreadSuffix: string;
  logout: string;
  emptyList: string;
  // 会话条目
  endedBadge: string;
  // 聊天页
  backToList: string;
  conversation: string;
  closeConv: string;
  reopenConv: string;
  loading: string;
  inputPh: string;
  inputPhClosed: string;
  send: string;
  sendImage: string;
  // 时间
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  // 商品卡片
  productLoading: string;
  productMissing: string;
  inStock: string;
  outOfStock: string;
  viewDetail: string;
};

export const csDict: CsDict = {
  // 登录页
  loginTitle: '상담원 작업대',
  loginSubtitle: '상담원 계정으로 로그인',
  loginAccountLabel: '상담원 계정',
  loginAccountPh: '상담원 계정을 입력하세요',
  loginPasswordLabel: '비밀번호',
  loginPasswordPh: '비밀번호를 입력하세요',
  loginSubmit: '로그인',
  loginSubmitting: '로그인 중…',
  loginFooter: '계정은 관리자가 후대에서 생성합니다',
  // 登录错误
  errMissingFields: '계정과 비밀번호를 입력하세요',
  errInvalidCredentials: '계정 또는 비밀번호가 올바르지 않습니다',
  errAgentDisabled: '사용 중지된 계정입니다. 관리자에게 문의하세요',
  errServerError: '서버 오류가 발생했습니다. 잠시 후 다시 시도하세요',
  errLoginFailed: '로그인에 실패했습니다',
  // 工作台
  workbenchTitle: '상담원 작업대',
  connOpen: '● 연결됨',
  connReconnecting: '○ 재연결 중…',
  connLost: '○ 연결 끊김',
  unreadSuffix: '개 안읽음',
  logout: '로그아웃',
  emptyList: '아직 문의가 없습니다',
  // 会话条目
  endedBadge: '종료됨',
  // 聊天页
  backToList: '목록으로',
  conversation: '대화',
  closeConv: '종료',
  reopenConv: '재개',
  loading: '불러오는 중…',
  inputPh: '메시지를 입력하세요…',
  inputPhClosed: '대화가 종료되었습니다',
  send: '전송',
  sendImage: '이미지 전송',
  // 时间
  justNow: '방금',
  minutesAgo: '분 전',
  hoursAgo: '시간 전',
  daysAgo: '일 전',
  // 商品卡片
  productLoading: '상품 불러오는 중…',
  productMissing: '판매가 중단되었거나 존재하지 않는 상품입니다',
  inStock: '재고 있음',
  outOfStock: '재고 없음',
  viewDetail: '상품 상세 보기 ↗',
};
