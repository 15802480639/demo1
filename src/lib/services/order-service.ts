import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { sendEmail, orderConfirmationHtml } from '@/lib/mailer';
import type { Product, Sku } from '@prisma/client';

export type OrderInputItem = { slug: string; size?: string; qty: number };

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

function matchSku(
  skus: { id: string; options: string | null; price: number | null; stock: number }[],
  size?: string,
) {
  if (!skus.length) return null;
  if (size) {
    const found = skus.find((s) => parseObj(s.options)?.Size === size);
    if (found) return found;
  }
  return skus[0];
}

export async function createOrder(input: {
  items: OrderInputItem[];
  shipping: OrderShipping;
  session: SessionUser | null;
  couponCode?: string;
}) {
  const { items, shipping, session, couponCode } = input;

  const products = (await prisma.product.findMany({
    where: { slug: { in: items.map((i) => i.slug) }, status: 'active' },
    include: { skus: true },
  })) as (Product & { skus: Sku[] })[];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const orderItems: Array<{
    productId: string;
    skuId: string | null;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
  }> = [];
  let subtotal = 0;

  for (const it of items) {
    const p = bySlug.get(it.slug);
    if (!p) continue;
    const sku = matchSku(p.skus as any, it.size);
    const price = sku?.price ?? p.price;
    const qty = Math.max(1, Math.floor(it.qty));
    if (sku) {
      if (sku.stock < qty) {
        throw new Error(`STOCK:${p.name}`);
      }
    }
    subtotal += price * qty;
    orderItems.push({
      productId: p.id,
      skuId: sku?.id ?? null,
      name: p.name,
      price,
      quantity: qty,
      imageUrl: parseArr(p.images)[0] ?? null,
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
        c.minSpend <= subtotal &&
        (!c.usageLimit || c.usedCount < c.usageLimit);
      if (valid) {
        discount =
          c.type === 'percent'
            ? Math.round((subtotal * c.value) / 100)
            : Math.min(c.value, subtotal);
        appliedCoupon = c.code;
        await prisma.coupon.update({
          where: { id: c.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }
  }

  const shippingFee = subtotal - discount >= FREE_SHIP_THRESHOLD ? 0 : SHIP_FEE;
  const total = Math.max(0, subtotal - discount) + shippingFee;

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
      total,
      currency: 'KRW',
      couponCode: appliedCoupon,
      addressId: address.id,
      items: { create: orderItems },
    },
    include: { items: true, user: true },
  });

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

export async function getAdminOrders(take = 50) {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: { items: true, user: true },
  });
}

export async function updateOrderStatus(id: string, status: string) {
  if (!ORDER_STATUSES.includes(status as any)) throw new Error('BAD_STATUS');
  return prisma.order.update({ where: { id }, data: { status } });
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
  return prisma.order.update({ where: { orderNo }, data: { status: 'cancelled' } });
}
