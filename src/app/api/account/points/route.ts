import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPointRule, getUserPoints, getPointTransactions } from '@/lib/points';

/**
 * 用户积分中心数据。
 * GET /api/account/points
 * 返回：当前余额、积分规则（用于展示怎么用）、流水明细、获得途径说明。
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const [points, rule, txns] = await Promise.all([
      getUserPoints(session.id),
      getPointRule(),
      getPointTransactions(session.id, 100),
    ]);

    return NextResponse.json({
      points,
      rule,
      transactions: txns.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        remark: t.remark,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
        orderNo: t.order?.orderNo ?? null,
      })),
      // 获得途径说明：前台「我的积分」页直接展示，不用硬编码在组件里
      earnWays: [
        {
          key: 'purchase',
          title: '购买商品返积分',
          desc: `订单支付成功后，按实付金额的 ${rule.earnPercent}% 获得积分（部分商品可单独设置比例）。`,
        },
        {
          key: 'redeem',
          title: '积分抵扣现金',
          desc: `订单实付满 ${rule.minSpendForUse.toLocaleString()}₩ 可用积分抵扣，最多抵订单金额的 ${rule.maxUsePercent}%。`,
        },
        {
          key: 'admin',
          title: '客服手动调整',
          desc: '如遇特殊情况，客服可为你手动增加或扣减积分。',
        },
      ],
    });
  } catch (e) {
    console.error('points fetch error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
