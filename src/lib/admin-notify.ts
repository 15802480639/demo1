// 后台通知中心 —— 新订单 / 新客服消息的提醒数据源
//
// ⭐ 为什么用「通知表 + 按人已读游标」而不是直接查订单表：
//   - 未读必须按人记（跟 ChatReadCursor 同理：A 看了不等于 B 看了）
//   - 标题/金额在通知生成时快照，订单后续变了也不影响已发的提醒
//
// ⚠️ 写通知失败绝不能影响下单/发消息的主流程。

import { prisma } from '@/lib/prisma';

/** 生成一条新订单通知 */
export async function notifyNewOrder(order: {
  orderNo: string;
  total: number;
  itemCount?: number;
  customerName?: string | null;
}): Promise<boolean> {
  try {
    const krw = new Intl.NumberFormat('ko-KR').format(order.total);
    await prisma.adminNotification.create({
      data: {
        type: 'order',
        title: `새 주문 ${order.orderNo}`,
        body: `${order.customerName ? `${order.customerName} · ` : ''}₩${krw}${
          order.itemCount ? ` · ${order.itemCount}개` : ''
        }`,
        link: `/${'ko'}/admin/orders?orderNo=${encodeURIComponent(order.orderNo)}`,
        orderId: null,
      },
    });
    return true;
  } catch (e) {
    console.error('[notify] order notify failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** 生成一条新客服消息通知 */
export async function notifyNewChatMessage(conversationId: string, preview: string): Promise<boolean> {
  try {
    const text = (preview || '').slice(0, 80);
    await prisma.adminNotification.create({
      data: {
        type: 'chat',
        title: '새 상담 메시지',
        body: text,
        link: `/${'ko'}/admin/chat`,
        conversationId,
      },
    });
    return true;
  } catch (e) {
    console.error('[notify] chat notify failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** 取当前管理员的未读通知（含总数） */
export async function getUnreadNotifications(userId: string, take = 20) {
  const [rows, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({
      where: { reads: { none: { userId } } },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.adminNotification.count({
      where: { reads: { none: { userId } } },
    }),
  ]);
  return {
    unreadCount,
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

/** 把指定通知标记为已读（幂等） */
export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  try {
    if (ids && ids.length) {
      const rows = await prisma.adminNotificationRead.findMany({
        where: { userId, notificationId: { in: ids } },
        select: { notificationId: true },
      });
      const already = new Set(rows.map((r) => r.notificationId));
      const need = ids.filter((id) => !already.has(id));
      if (need.length) {
        await prisma.adminNotificationRead.createMany({
          data: need.map((notificationId) => ({ notificationId, userId })),
          skipDuplicates: true,
        });
      }
      return need.length;
    }
    // 不传 id = 全部标记已读
    const unread = await prisma.adminNotification.findMany({
      where: { reads: { none: { userId } } },
      select: { id: true },
    });
    const ids2 = unread.map((n) => n.id);
    if (ids2.length) {
      await prisma.adminNotificationRead.createMany({
        data: ids2.map((notificationId) => ({ notificationId, userId })),
        skipDuplicates: true,
      });
    }
    return ids2.length;
  } catch (e) {
    console.error('[notify] mark read failed:', e instanceof Error ? e.message : e);
    return 0;
  }
}
