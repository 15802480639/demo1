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

/** 商品状态：后台固定显示中文 */
const PRODUCT_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '在售',
  archived: '已归档',
};

export function productStatusLabel(status: string): string {
  return PRODUCT_LABELS[status] ?? status;
}

/** Banner 上下架状态：后台固定显示中文 */
export function bannerStatusLabel(status: string): string {
  return status === 'published' ? '已上架' : status === 'draft' ? '草稿' : status;
}
