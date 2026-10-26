import type { Locale } from '@/i18n/config';

const LABELS: Record<string, { ko: string; zh: string; en: string }> = {
  pending: { ko: '주문접수', zh: '待处理', en: 'Received' },
  paid: { ko: '결제완료', zh: '已支付', en: 'Paid' },
  fulfilled: { ko: '상품준비중', zh: '备货中', en: 'Preparing' },
  shipped: { ko: '배송중', zh: '已发货', en: 'Shipped' },
  completed: { ko: '배송완료', zh: '已完成', en: 'Completed' },
  cancelled: { ko: '주문취소', zh: '已取消', en: 'Cancelled' },
  refunded: { ko: '환불완료', zh: '已退款', en: 'Refunded' },
};

export function statusLabel(status: string, locale: Locale): string {
  return LABELS[status]?.[locale] ?? status;
}

/** 商品状态：跟随界面语言 */
const PRODUCT_LABELS: Record<string, { ko: string; zh: string; en: string }> = {
  draft: { ko: '초안', zh: '草稿', en: 'Draft' },
  active: { ko: '판매중', zh: '在售', en: 'Active' },
  archived: { ko: '보관됨', zh: '已归档', en: 'Archived' },
};

export function productStatusLabel(status: string, locale: Locale): string {
  return PRODUCT_LABELS[status]?.[locale] ?? status;
}

/** Banner 上下架状态：跟随界面语言 */
export function bannerStatusLabel(status: string, locale: Locale): string {
  const map: Record<string, { ko: string; zh: string; en: string }> = {
    published: { ko: '게시됨', zh: '已上架', en: 'Published' },
    draft: { ko: '초안', zh: '草稿', en: 'Draft' },
  };
  return map[status]?.[locale] ?? status;
}
