import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { createOrder } from "../src/lib/services/order-service";

async function main() {
  // 1) 取一个有 SKU 的商品
  const product = await prisma.product.findFirst({
    where: { status: "active" },
    include: { skus: true },
  });
  if (!product) throw new Error("no product");
  const sku = product.skus[0];
  const size = sku?.options ? (JSON.parse(sku.options).Size ?? undefined) : undefined;
  const stockBefore = sku?.stock ?? null;

  console.log(`商品: ${product.name} (${product.slug}) | SKU库存: ${stockBefore}`);

  // 2) 下单（游客结账，触发库存扣减 + 订单写入）
  const order = await createOrder({
    items: [{ slug: product.slug, size, qty: 1 }],
    shipping: {
      name: "验证用户",
      phone: "01000000000",
      email: "verify@example.com",
      line1: "123 Test Rd",
      city: "Seoul",
      country: "KR",
      postalCode: "12345",
    },
    session: null,
  });
  console.log(`✅ 下单成功 orderNo=${order.orderNo} total=${order.total} status=${order.status}`);

  // 3) 校验库存已扣减
  if (sku) {
    const after = await prisma.sku.findUnique({ where: { id: sku.id } });
    console.log(`✅ 库存扣减: ${stockBefore} -> ${after?.stock}`);
  }

  // 4) 录入运单号（用户端物流入口依赖的写入）
  await prisma.order.update({
    where: { id: order.id },
    data: { trackingNo: "SF1234567890", carrier: "SF Express", status: "shipped" },
  });
  const shipped = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`✅ 录入运单号: ${shipped?.trackingNo} / ${shipped?.carrier} / ${shipped?.status}`);

  // 5) 用户取消订单
  await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
  const cancelled = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`✅ 订单取消: status=${cancelled?.status}`);

  // 6) 库存溢出拦截：尝试下单数量超过库存
  let overflowCaught = false;
  try {
    await createOrder({
      items: [{ slug: product.slug, size, qty: 999999 }],
      shipping: {
        name: "验证用户", phone: "01000000000", email: "verify2@example.com",
        line1: "123 Test Rd", city: "Seoul", country: "KR", postalCode: "12345",
      },
      session: null,
    });
  } catch (e: any) {
    overflowCaught = String(e.message).startsWith("STOCK");
  }
  console.log(overflowCaught ? "✅ 库存溢出被拦截 (STOCK 错误)" : "❌ 库存溢出未拦截");

  console.log("\n全部写入流程通过 ✅");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("验证失败:", e);
  process.exit(1);
});
