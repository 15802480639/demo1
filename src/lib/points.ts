import { prisma } from '@/lib/prisma';

/**
 * 积分体系 —— 唯一真源。
 *
 * 设计要点：
 * 1. 规则存在 PointRule 单例表（id='global'），后台可改。
 * 2. 商品级配置（Product.earnPoints / earnType / earnValue / usePoints / maxPointUse）覆盖全局默认。
 * 3. 所有积分增减必须走 adjustPoints()，写入 PointTransaction 留痕，禁止直接改 User.points。
 * 4. 退款时必须扣回当初赠送的积分 —— 由 Order.pointsEarned 记录，靠 pointsSettled 防重复扣。
 */

/** 默认规则：与 schema 里的默认值保持一致 */
export const DEFAULT_POINT_RULE = {
  enabled: true,
  earnPercent: 5,
  minSpendForUse: 50000,
  pointsPerKrw: 100,
  maxUsePercent: 30,
};

export type PointRuleData = typeof DEFAULT_POINT_RULE;

/** 读取全局积分规则（不存在则用默认值，不写库） */
export async function getPointRule(): Promise<PointRuleData> {
  try {
    const r = await prisma.pointRule.findUnique({ where: { id: 'global' } });
    if (!r) return { ...DEFAULT_POINT_RULE };
    return {
      enabled: r.enabled,
      earnPercent: r.earnPercent,
      minSpendForUse: r.minSpendForUse,
      pointsPerKrw: r.pointsPerKrw,
      maxUsePercent: r.maxUsePercent,
    };
  } catch {
    // 表还没建（首次部署 / 迁移未执行）时不能让整站挂掉
    return { ...DEFAULT_POINT_RULE };
  }
}

/** 保存全局积分规则 */
export async function savePointRule(data: Partial<PointRuleData>): Promise<PointRuleData> {
  const cur = await getPointRule();
  const next: PointRuleData = {
    enabled: data.enabled ?? cur.enabled,
    earnPercent: clampInt(data.earnPercent ?? cur.earnPercent, 0, 100),
    minSpendForUse: Math.max(0, Math.floor(data.minSpendForUse ?? cur.minSpendForUse)),
    pointsPerKrw: Math.max(1, Math.floor(data.pointsPerKrw ?? cur.pointsPerKrw)),
    maxUsePercent: clampInt(data.maxUsePercent ?? cur.maxUsePercent, 0, 100),
  };
  await prisma.pointRule.upsert({
    where: { id: 'global' },
    create: { id: 'global', ...next },
    update: next,
  });
  return next;
}

function clampInt(v: number, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** 商品级积分配置（覆盖全局） */
export type ProductPointConfig = {
  earnPoints: boolean;
  earnType: string;
  earnValue: number;
  usePoints: boolean;
  maxPointUse: number;
};

/** 可参与积分抵扣的商品行 */
export type RedeemableLine = {
  productId: string;
  /** 该行商品金额（单价 × 数量） */
  amount: number;
  /** 该商品是否允许用积分抵扣 */
  usePoints: boolean;
  /** 该商品单笔最多可抵扣积分数（0 = 不限） */
  maxPointUse: number;
};

export type RedeemQuote = {
  /** 本单最多能抵扣的现金金额（韩元） */
  maxDiscount: number;
  /** 本单最多能用的积分数 */
  maxPoints: number;
  /** 是否满足「满多少可用积分」门槛 */
  eligible: boolean;
  /** 不可用时的原因 */
  reason: string;
  /** 实际生效的单笔抵扣上限百分比 */
  maxUsePercent: number;
};

/**
 * 计算本单最多能抵扣多少积分 / 多少现金。
 *
 * @param payableAmount 订单实付金额（已扣优惠券，未扣积分）
 * @param lines         订单行及其积分配置
 * @param userPoints    用户当前积分余额
 * @param rule          全局规则
 */
export function calcRedeemQuote(
  payableAmount: number,
  lines: RedeemableLine[],
  userPoints: number,
  rule: PointRuleData,
): RedeemQuote {
  const empty: RedeemQuote = {
    maxDiscount: 0,
    maxPoints: 0,
    eligible: false,
    reason: '',
    maxUsePercent: rule.maxUsePercent,
  };

  if (!rule.enabled) return { ...empty, reason: 'DISABLED' };
  if (userPoints <= 0) return { ...empty, reason: 'NO_POINTS' };
  if (payableAmount < rule.minSpendForUse) return { ...empty, reason: 'BELOW_MIN' };

  // 只有允许用积分抵扣的商品才计入可抵扣基数
  const redeemableAmount = lines
    .filter((l) => l.usePoints)
    .reduce((s, l) => s + l.amount, 0);
  if (redeemableAmount <= 0) return { ...empty, reason: 'NO_REDEEMABLE_ITEM' };

  // 全局上限：最多抵订单金额的 maxUsePercent%
  const globalCap = Math.floor((payableAmount * rule.maxUsePercent) / 100);

  // 商品级上限：把每件商品允许抵扣的积分换算成金额后求和
  let itemCap = 0;
  for (const l of lines) {
    if (!l.usePoints) continue;
    if (l.maxPointUse > 0) {
      itemCap += Math.min(l.amount, Math.floor((l.maxPointUse * rule.pointsPerKrw) / 100));
    } else {
      itemCap += l.amount;
    }
  }

  const maxDiscount = Math.max(0, Math.min(globalCap, itemCap));
  if (maxDiscount <= 0) return { ...empty, reason: 'NO_REDEEMABLE_ITEM' };

  // 换算成积分数：maxDiscount 韩元 × pointsPerKrw / 100
  const maxPointsByMoney = Math.floor((maxDiscount * rule.pointsPerKrw) / 100);
  const maxPoints = Math.min(maxPointsByMoney, userPoints);

  return {
    maxDiscount,
    maxPoints,
    eligible: true,
    reason: '',
    maxUsePercent: rule.maxUsePercent,
  };
}

/**
 * 把「想抵扣的现金金额」换算成实际可用积分数。
 * 向下取整保证不会超扣（宁可少抵不超抵）。
 */
export function pointsToDiscount(points: number, rule: PointRuleData): number {
  return Math.floor((points * 100) / rule.pointsPerKrw);
}

/**
 * 计算本单消费应返多少积分。
 *
 * @param lines 订单行：{ amount 该行实付, earnPoints 是否参与, earnType, earnValue }
 */
export function calcEarnPoints(
  lines: Array<{
    amount: number;
    earnPoints: boolean;
    earnType: string;
    earnValue: number;
  }>,
  rule: PointRuleData,
): number {
  if (!rule.enabled) return 0;
  let total = 0;
  for (const l of lines) {
    if (!l.earnPoints) continue;
    if (l.earnType === 'fixed') {
      // fixed 模式下 earnValue 是「每件返多少积分」，但商品行没有 qty，
      // 这里由调用方把 qty 乘进 amount 之外的字段 —— 见 calcEarnPointsWithQty
      total += Math.max(0, Math.floor(l.earnValue));
      continue;
    }
    // percent：商品有自定义比例就用商品自己的，否则用全局
    const percent = l.earnValue > 0 ? l.earnValue : rule.earnPercent;
    total += Math.floor((l.amount * percent) / 100);
  }
  return Math.max(0, total);
}

/**
 * 计算返积分 —— 带数量的版本。
 * fixed 模式下每件返 earnValue 分，所以要乘数量。
 */
export function calcEarnPointsWithQty(
  lines: Array<{
    amount: number;
    quantity: number;
    earnPoints: boolean;
    earnType: string;
    earnValue: number;
  }>,
  rule: PointRuleData,
): number {
  if (!rule.enabled) return 0;
  let total = 0;
  for (const l of lines) {
    if (!l.earnPoints) continue;
    if (l.earnType === 'fixed') {
      total += Math.max(0, Math.floor(l.earnValue)) * Math.max(1, l.quantity);
      continue;
    }
    const percent = l.earnValue > 0 ? l.earnValue : rule.earnPercent;
    total += Math.floor((l.amount * percent) / 100);
  }
  return Math.max(0, total);
}

/**
 * 调整用户积分并写流水。所有积分变动都必须走这里。
 *
 * @param amount 正数增加，负数扣减
 * @param type earn | use | refund_deduct | admin_add | admin_minus
 */
export async function adjustPoints(params: {
  userId: string;
  amount: number;
  type: string;
  orderId?: string | null;
  remark?: string | null;
}): Promise<{ balance: number; amount: number }> {
  const { userId, amount, type, orderId, remark } = params;
  const delta = Math.trunc(amount);
  if (!delta) return { balance: (await getUserPoints(userId)), amount: 0 };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const next = Math.max(0, user.points + delta);
  // 实际生效的变动量（余额不足时只能扣到 0）
  const applied = next - user.points;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { points: next } }),
    prisma.pointTransaction.create({
      data: {
        userId,
        amount: applied,
        type,
        orderId: orderId ?? null,
        remark: remark ?? null,
        balanceAfter: next,
      },
    }),
  ]);

  return { balance: next, amount: applied };
}

/** 读取用户积分余额 */
export async function getUserPoints(userId: string): Promise<number> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    return u?.points ?? 0;
  } catch {
    return 0;
  }
}

/** 读取用户积分流水（最新在前） */
export async function getPointTransactions(userId: string, take = 50) {
  try {
    return await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { order: { select: { orderNo: true } } },
    });
  } catch {
    return [];
  }
}

/**
 * 退款/取消订单时冲回积分。
 *
 * 幂等保护：靠「该订单是否已存在 refund_deduct 流水」判断，
 * 而不是靠 pointsSettled 标记 —— 因为 pointsSettled 表达的是「积分已发放」，
 * 一个订单可能经历 发放 → 冲回 → 再发放，用单一标记表达不了这个状态机。
 */
export async function reverseOrderPoints(
  orderId: string,
  reason: 'refund' | 'cancel',
): Promise<{ deducted: number; refunded: number }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      pointsEarned: true,
      pointsUsed: true,
      orderNo: true,
    },
  });
  if (!order) return { deducted: 0, refunded: 0 };

  // 已经冲回过一次 → 不重复
  const existing = await prisma.pointTransaction.findFirst({
    where: { orderId: order.id, type: 'refund_deduct' },
  });
  if (existing) return { deducted: 0, refunded: 0 };

  const label = reason === 'refund' ? '退款' : '取消';
  let deducted = 0;
  let refunded = 0;

  // 赠送的积分要扣回
  if (order.pointsEarned > 0) {
    const r = await adjustPoints({
      userId: order.userId,
      amount: -order.pointsEarned,
      type: 'refund_deduct',
      orderId: order.id,
      remark: `订单 ${order.orderNo} ${label}，扣回赠送积分`,
    });
    deducted = Math.abs(r.amount);
  }

  // 用户下单时用掉的积分要退回（没收到货）
  if (order.pointsUsed > 0) {
    const r = await adjustPoints({
      userId: order.userId,
      amount: order.pointsUsed,
      type: 'refund_deduct',
      orderId: order.id,
      remark: `订单 ${order.orderNo} ${label}，退回已使用积分`,
    });
    refunded = r.amount;
  }

  return { deducted, refunded };
}

