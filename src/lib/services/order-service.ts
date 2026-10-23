import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { sendEmail, orderConfirmationHtml } from '@/lib/mailer';
import type { Product, Sku } from '@prisma/client';
import {
  getPointRule,
  calcRedeemQuote,
  calcEarnPointsWithQty,
  pointsToDiscount,
  adjustPoints,
  reverseOrderPoints,
  grantCouponsForOrder,
} from '@/lib/points';

export type OrderInputItem = {
  slug: string;
  size?: string;
  /** 选中的规格组合原值 { "색상": "화이트", "사이즈": "M" }，用于精确匹配 SKU */
  options?: Record<string, string>;
  qty: number;
};

export type OrderShipping = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
};

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'fulfilled',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
] as const;

const FREE_SHIP_THRESHOLD = 100000; // ₩100,000 이상 무료배송
const SHIP_FEE = 3000;

function parseArr(s?: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseObj(s?: string | null): Record<string, string> | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? (v as Record<string, string>) : null;
  } catch {
    return null;
  }
}

function genOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MK-${ymd}-${rand}`;
}

/**
 * 匹配 SKU —— 精确匹配规格组合。
 *
 * 🔴 历史 bug（2026-10-23 修复）：
 * 原来只比较 `parseObj(s.options)?.Size === size`，
 * 而 size 传进来的是展示用拼接串「颜色:红色 / 尺码:M」，
 * 永远匹配不上 options.Size（值是 "M"）→ 一律退回 skus[0]。
 * 结果：多规格商品下单时扣错库存、算错价格，订单详情也看不到尺码颜色。
 *
 * 现在改为：优先用 options 组合全等匹配；没有 options 时再退回按 size 拆分匹配。
 */
function matchSku(
  skus: { id: string; options: string | null; price: number | null; stock: number }[],
  size?: string,
  options?: Record<string, string>,
) {
  if (!skus.length) return null;

  // 1) 精确匹配：options 里每一项都要与 SKU 的 options 对上
  if (options && Object.keys(options).length > 0) {
    const keys = Object.keys(options).filter((k) => options[k]);
    if (keys.length) {
      const found = skus.find((s) => {
        const o = parseObj(s.options);
        if (!o) return false;
        return keys.every((k) => o[k] === options[k]);
      });
      if (found) return found;
    }
  }

  // 2) 退化匹配：把展示串「颜色:红色 / 尺码:M」拆成键值对再比
  if (size) {
    const parsed = parseSizeLabel(size);
    const keys = Object.keys(parsed);
    if (keys.length) {
      const found = skus.find((s) => {
        const o = parseObj(s.options);
        if (!o) return false;
        return keys.every((k) => {
          // 键名可能是韩文（사이즈），也可能是英文（Size），两边都试
          const v = parsed[k];
          return o[k] === v || o[k.toLowerCase()] === v;
        });
      });
      if (found) return found;
    }
    // 3) 最后的兜底：只看 Size 值完全相等（老数据兼容）
    const found = skus.find((s) => parseObj(s.options)?.Size === size);
    if (found) return found;
  }

  return skus[0];
}

/** 把「颜色:红色 / 尺码:M」拆成 { "颜色": "红色", "尺码": "M" } */
function parseSizeLabel(label: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of label.split('/')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

/**
 * 生成规格可读摘要，如「颜色:红色 / 尺码:中号」。
 *
 * 注意：订单快照要长期保存，不能只存一种语言 —— 前台 zh/ko/en 三个页面都要显示。
 * 所以：
 * - options 存原始 JSON（韩文键 + 韩文值）→ 数据库真源，SKU 匹配靠它
 * - skuLabel 存「中文字段名 + 中文值」→ 中文页面直接可读
 *   （中文值来自 ProductSpec.values 里的 zh 字段；查不到就退回原始值）
 * - 英文页面显示中文也能看懂结构，如需英文可后续加 skuLabelEn 字段
 */
function buildSkuLabel(
  options: Record<string, string> | null,
  specNames?: Map<string, string>,
  valueZh?: Map<string, string>,
): string | null {
  if (!options) return null;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(options)) {
    if (!k || !v) continue;
    const label = specNames?.get(k) ?? k;
    const shown = valueZh?.get(`${k}=${v}`) ?? valueZh?.get(`${label}=${v}`) ?? v;
    parts.push(`${label}:${shown}`);
  }
  return parts.length ? parts.join(' / ') : null;
}

/**
 * 构造两张映射表：
 * 1. 规格组名 → 中文字段名（색상 → 颜色）
 * 2. 「键=值」→ 中文值（색상=레드 → 红色）
 */
function buildSpecNameMap(
  specs: { name: string; nameZh: string | null; values: string }[],
): { names: Map<string, string>; values: Map<string, string> } {
  const names = new Map<string, string>();
  const values = new Map<string, string>();
  for (const sp of specs) {
    const zhName = sp.nameZh ?? sp.name;
    names.set(sp.name, zhName);
    names.set(zhName, zhName);

    // values 形如 [{"ko":"레드","zh":"红色"}]
    try {
      const arr = JSON.parse(sp.values || '[]');
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          const ko = (item as { ko?: string }).ko;
          const zh = (item as { zh?: string }).zh;
          if (!ko) continue;
          if (zh) {
            values.set(`${sp.name}=${ko}`, zh);
            values.set(`${zhName}=${ko}`, zh);
          }
        }
      }
    } catch {
      // 规格值解析失败就退回原始值
    }
  }
  return { names, values };
}

export async function createOrder(input: {
  items: OrderInputItem[];
  shipping: OrderShipping;
  session: SessionUser | null;
  couponCode?: string;
  /** 用户想用多少积分抵扣（积分数） */
  usePoints?: number;
}) {
  const { items, shipping, session, couponCode } = input;

  const products = (await prisma.product.findMany({
    where: { slug: { in: items.map((i) => i.slug) }, status: 'active' },
    include: { skus: true, specs: true },
  })) as (Product & { skus: Sku[]; specs: { name: string; nameZh: string | null; values: string }[] })[];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const orderItems: Array<{
    productId: string;
    skuId: string | null;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
    options: string | null;
    skuLabel: string | null;
  }> = [];
  // 每行的积分配置 + 金额，用于后面算抵扣与返积分
  const lineMeta: Array<{
    productId: string;
    amount: number;
    quantity: number;
    usePoints: boolean;
    maxPointUse: number;
    earnPoints: boolean;
    earnType: string;
    earnValue: number;
  }> = [];
  let subtotal = 0;

  for (const it of items) {
    const p = bySlug.get(it.slug);
    if (!p) continue;
    const sku = matchSku(p.skus as any, it.size, it.options);
    const price = sku?.price ?? p.price;
    const qty = Math.max(1, Math.floor(it.qty));
    if (sku) {
      if (sku.stock < qty) {
        throw new Error(`STOCK:${p.name}`);
      }
    }
    const amount = price * qty;
    subtotal += amount;

    // 规格快照：SKU 的 options 是权威来源（下单当时选中的组合）
    const skuOptions = parseObj(sku?.options) ?? (it.options ?? null);
    const { names: specNames, values: specValues } = buildSpecNameMap(p.specs ?? []);
    const skuLabel = buildSkuLabel(skuOptions, specNames, specValues);

    orderItems.push({
      productId: p.id,
      skuId: sku?.id ?? null,
      name: p.name,
      price,
      quantity: qty,
      imageUrl: parseArr(p.images)[0] ?? null,
      options: skuOptions ? JSON.stringify(skuOptions) : null,
      skuLabel,
    });
    lineMeta.push({
      productId: p.id,
      amount,
      quantity: qty,
      usePoints: p.usePoints,
      maxPointUse: p.maxPointUse,
      earnPoints: p.earnPoints,
      earnType: p.earnType,
      earnValue: p.earnValue,
    });
    if (sku) {
      await prisma.sku.update({
        where: { id: sku.id },
        data: { stock: sku.stock - qty },
      });
    }
  }

  if (!orderItems.length) throw new Error('NO_ITEMS');

  // 优惠券
  let discount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const c = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (c && c.active) {
      const now = new Date();
      const valid =
        (!c.startsAt || c.startsAt <= now) &&
        (!c.expiresAt || c.expiresAt >= now) &&
        (!c.usageLimit || c.usedCount < c.usageLimit);
      if (valid) {
        // 适用商品：productIds 为空 = 全场通用；否则只对订单里的适用商品小计打折
        let applicableSub = subtotal;
        try {
          const ids: string[] = JSON.parse(c.productIds || '[]');
          if (Array.isArray(ids) && ids.length > 0) {
            applicableSub = orderItems
              .filter((oi) => ids.includes(oi.productId))
              .reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
          }
        } catch {
          // 解析失败按全场通用
        }
        if (applicableSub > 0 && c.minSpend <= applicableSub) {
          discount =
            c.type === 'percent'
              ? Math.round((applicableSub * c.value) / 100)
              : Math.min(c.value, applicableSub);
          appliedCoupon = c.code;
          await prisma.coupon.update({
            where: { id: c.id },
            data: { usedCount: { increment: 1 } },
          });
          // UserCoupon 的状态在订单创建后统一更新（需要订单号）
        }
      }
    }
  }

  // ---- 用户身份（积分必须挂在真实用户上）----
  let user = session ? await prisma.user.findUnique({ where: { id: session.id } }) : null;
  if (!user) {
    user = await prisma.user.upsert({
      where: { email: shipping.email.toLowerCase() },
      update: { name: shipping.name },
      create: {
        email: shipping.email.toLowerCase(),
        name: shipping.name,
        role: 'customer',
      },
    });
  }

  // ---- 积分抵扣 ----
  const rule = await getPointRule();
  const payableBeforePoints = Math.max(0, subtotal - discount);
  let pointsUsed = 0;
  let pointsDiscount = 0;

  if (rule.enabled && input.usePoints && input.usePoints > 0 && session) {
    const quote = calcRedeemQuote(
      payableBeforePoints,
      lineMeta.map((l) => ({
        productId: l.productId,
        amount: l.amount,
        usePoints: l.usePoints,
        maxPointUse: l.maxPointUse,
      })),
      user.points,
      rule,
    );
    if (quote.eligible) {
      // 用户请求的积分数不能超过上限
      const requested = Math.floor(input.usePoints);
      pointsUsed = Math.min(requested, quote.maxPoints);
      // 换算成现金，但也不能超过本单可抵扣金额
      pointsDiscount = Math.min(
        pointsToDiscount(pointsUsed, rule),
        payableBeforePoints,
        quote.maxDiscount,
      );
      // 抵扣金额反推实际消耗积分（向下取整，避免多扣积分）
      if (pointsDiscount > 0) {
        pointsUsed = Math.min(pointsUsed, Math.floor((pointsDiscount * rule.pointsPerKrw) / 100));
      } else {
        pointsUsed = 0;
      }
    }
  }

  const shippingFee = payableBeforePoints - pointsDiscount >= FREE_SHIP_THRESHOLD ? 0 : SHIP_FEE;
  const total = Math.max(0, payableBeforePoints - pointsDiscount) + shippingFee;

  // 按比例把实际支付金额分摊到每一行，返积分按「实付」算
  const payBase = Math.max(0, payableBeforePoints - pointsDiscount);
  const paidAmounts = distributePaid(lineMeta.map((l) => l.amount), payBase);
  const earnPoints = calcEarnPointsWithQty(
    lineMeta.map((l, i) => ({
      amount: paidAmounts[i],
      quantity: l.quantity,
      earnPoints: l.earnPoints,
      earnType: l.earnType,
      earnValue: l.earnValue,
    })),
    rule,
  );

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      name: shipping.name,
      line1: shipping.line1,
      line2: shipping.line2,
      city: shipping.city,
      state: shipping.state,
      country: shipping.country,
      postalCode: shipping.postalCode,
      phone: shipping.phone,
      isDefault: true,
    },
  });

  let orderNo = genOrderNo();
  for (let i = 0; i < 5; i++) {
    const ex = await prisma.order.findUnique({ where: { orderNo } });
    if (!ex) break;
    orderNo = genOrderNo();
  }

  const order = await prisma.order.create({
    data: {
      orderNo,
      userId: user.id,
      subtotal,
      discount,
      shippingFee,
      tax: 0,
      pointsDiscount,
      pointsUsed,
      pointsEarned: 0, // 下面发放后再更新
      total,
      currency: 'KRW',
      couponCode: appliedCoupon,
      addressId: address.id,
      items: {
        create: orderItems.map((oi, i) => ({
          ...oi,
          paidAmount: paidAmounts[i],
        })),
      },
    },
    include: { items: true, user: true },
  });

  // 券标记为已使用（补上订单号）
  if (appliedCoupon) {
    try {
      await prisma.userCoupon.updateMany({
        where: { coupon: { code: appliedCoupon }, userId: user.id, status: 'available' },
        data: { status: 'used', usedAt: new Date(), usedOrderNo: order.orderNo },
      });
    } catch {
      // 标记失败不影响下单
    }
  }

  // ---- 扣减用户积分 ----
  if (pointsUsed > 0) {
    await adjustPoints({
      userId: user.id,
      amount: -pointsUsed,
      type: 'use',
      orderId: order.id,
      remark: `订单 ${order.orderNo} 使用积分抵扣 ${pointsDiscount.toLocaleString()}₩`,
    });
  }

  // ---- 发放消费返积分 ----
  // 规则：订单进入「已支付」后才发积分，避免未付款订单白拿积分。
  // 本系统支付由后台改状态触发（见 updateOrderStatus → grantPointsForOrder）。
  // 抵扣用的积分在下单时立即扣减（占住额度），退款时再退回。

  // 邮件通知（fire-and-forget，失败不影响下单）
  void sendEmail({
    to: user.email,
    subject: `[WebShopp] ${order.orderNo}`,
    html: orderConfirmationHtml({
      orderNo: order.orderNo,
      total: order.total,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      locale: 'ko',
    }),
  }).catch(() => {});

  return order;
}

/** 把 total 按 weights 比例分摊，整数误差补给最后一行 */
function distributePaid(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      out.push(Math.max(0, total - acc));
    } else {
      const v = Math.round((weights[i] * total) / sum);
      out.push(v);
      acc += v;
    }
  }
  return out;
}

export async function getOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
}

export async function getOrderByNo(orderNo: string, userId?: string) {
  const o = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, address: true, user: true },
  });
  if (!o) return null;
  if (userId && o.userId !== userId) return null;
  return o;
}

export async function getAdminOrders(take = 200, userId?: string) {
  const orders = await prisma.order.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      items: true,
      user: true,
      address: true,
    },
  });
  if (!orders.length) return orders;

  // 附带「本单赠送的优惠券」信息（商品赠券功能，按订单号关联）
  const granted = await prisma.userCoupon.findMany({
    where: { grantedByOrder: { in: orders.map((o) => o.orderNo) } },
    select: {
      grantedByOrder: true,
      status: true,
      coupon: { select: { code: true } },
    },
  });
  const map = new Map<string, { code: string; status: string }[]>();
  for (const g of granted) {
    if (!g.grantedByOrder) continue;
    const arr = map.get(g.grantedByOrder) ?? [];
    arr.push({ code: g.coupon.code, status: g.status });
    map.set(g.grantedByOrder, arr);
  }
  return orders.map((o) => ({ ...o, grantedCoupons: map.get(o.orderNo) ?? [] }));
}

/**
 * 订单状态流转 —— 积分在这里发放/冲回。
 *
 * 积分规则：
 * - 状态变为 paid（已支付）→ 发放消费返积分
 * - 状态变为 refunded（已退款）→ 扣回赠送的积分 + 退回用掉的积分
 * - 状态变为 cancelled（已取消）→ 同退款，冲回积分
 * - 其余状态（备货/发货/完成）不涉及积分
 */
export async function updateOrderStatus(id: string, status: string) {
  if (!ORDER_STATUSES.includes(status as any)) throw new Error('BAD_STATUS');

  const prev = await prisma.order.findUnique({
    where: { id },
    select: { status: true, pointsSettled: true, pointsEarned: true },
  });

  const order = await prisma.order.update({ where: { id }, data: { status } });

  // 从非 paid 变成 paid → 发放积分
  if (status === 'paid' && prev?.status !== 'paid') {
    await grantPointsForOrder(id);
  }

  // 变成 refunded / cancelled → 冲回积分
  if ((status === 'refunded' || status === 'cancelled') && prev?.status !== status) {
    await reverseOrderPoints(id, status === 'refunded' ? 'refund' : 'cancel');
  }

  return order;
}

/**
 * 给已支付订单发放消费返积分。
 * 幂等：靠 Order.pointsSettled 标记，已发过的不重复发。
 */
export async function grantPointsForOrder(orderId: string): Promise<number> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return 0;
  if (order.pointsSettled) return 0; // 已发过

  // 商品赠送优惠券：与积分总开关无关，支付成功就发（内部自带幂等查重）
  await grantCouponsForOrder(orderId);

  const rule = await getPointRule();
  if (!rule.enabled) {
    await prisma.order.update({ where: { id: orderId }, data: { pointsSettled: true } });
    return 0;
  }

  const products: Array<{
    id: string;
    earnPoints: boolean;
    earnType: string;
    earnValue: number;
  }> = await prisma.product.findMany({
    where: { id: { in: order.items.map((i) => i.productId) } },
    select: { id: true, earnPoints: true, earnType: true, earnValue: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = order.items.map((i) => {
    const p = byId.get(i.productId);
    // 该行实付金额：优先用分摊快照，没有就用 单价×数量
    const amount = i.paidAmount > 0 ? i.paidAmount : i.price * i.quantity;
    return {
      amount,
      quantity: i.quantity,
      earnPoints: p?.earnPoints ?? true,
      earnType: p?.earnType ?? 'percent',
      earnValue: p?.earnValue ?? 0,
    };
  });

  const earned = calcEarnPointsWithQty(lines, rule);
  if (earned <= 0) {
    await prisma.order.update({ where: { id: orderId }, data: { pointsSettled: true } });
    return 0;
  }

  await adjustPoints({
    userId: order.userId,
    amount: earned,
    type: 'earn',
    orderId: order.id,
    remark: `订单 ${order.orderNo} 消费返积分`,
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { pointsEarned: earned, pointsSettled: true },
  });

  return earned;
}

const USER_CANCELLABLE: string[] = ['pending', 'paid'];

export async function cancelOrderByUser(orderNo: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { orderNo } });
  if (!order || order.userId !== userId) throw new Error('NOT_FOUND');
  if (!USER_CANCELLABLE.includes(order.status)) {
    throw new Error('NOT_CANCELLABLE');
  }
  // 退回库存
  const full = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true },
  });
  if (full) {
    for (const it of full.items) {
      if (it.skuId) {
        const sku = await prisma.sku.findUnique({ where: { id: it.skuId } });
        if (sku) {
          await prisma.sku.update({
            where: { id: sku.id },
            data: { stock: sku.stock + it.quantity },
          });
        }
      }
    }
  }
  // 取消订单 → 冲回积分（扣回赠送的、退回用掉的）
  if (full?.id) {
    await reverseOrderPoints(full.id, 'cancel');
  }
  return prisma.order.update({ where: { orderNo }, data: { status: 'cancelled' } });
}
