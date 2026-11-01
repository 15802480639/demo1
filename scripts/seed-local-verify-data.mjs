// 补齐本地验证所需的基础数据：会员账号、商品、订单
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const hash = bcrypt.hashSync('demo1234', 10);
const hashAdmin = bcrypt.hashSync('admin1234', 10);

// 1) 会员
let cust = await prisma.user.findUnique({ where: { email: 'demo@example.com' } });
if (!cust) {
  cust = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      username: 'demo',
      name: '데모회원',
      passwordHash: hash,
      role: 'customer',
      staffRole: 'owner',
    },
  });
  console.log('created customer', cust.id);
} else {
  await prisma.user.update({ where: { id: cust.id }, data: { passwordHash: hash } });
  console.log('customer exists', cust.id);
}

// 2) 第二个管理员（用于权限档位测试）
let admin2 = await prisma.user.findFirst({ where: { email: 'admin2@shop.com' } });
if (!admin2) {
  admin2 = await prisma.user.create({
    data: {
      email: 'admin2@shop.com',
      username: 'admin2',
      name: '부관리자',
      passwordHash: hashAdmin,
      role: 'admin',
      staffRole: 'order',
    },
  });
  console.log('created admin2', admin2.id);
}

// 3) 商品
const cats = await prisma.category.findMany({ take: 1 });
const brands = await prisma.brand.findMany({ take: 1 });
if (!cats.length) throw new Error('no category');
const cat = cats[0];
const brand = brands[0] || null;

let prod = await prisma.product.findFirst({ where: { slug: 'verify-product' } });
if (!prod) {
  prod = await prisma.product.create({
    data: {
      slug: 'verify-product',
      name: 'Verify Product',
      nameZh: '验证商品',
      categoryId: cat.id,
      brandId: brand?.id ?? null,
      price: 19900,
      compareAtPrice: 15900,
      status: 'active',
      description: 'verify',
    },
  });
  console.log('created product', prod.id);
}

// 4) 订单
const addr = await prisma.address.findFirst({ where: { userId: cust.id } });
let order = await prisma.order.findFirst({
  where: { userId: cust.id, orderNo: { startsWith: 'VERIFY' } },
});
if (!order) {
  const created = await prisma.order.create({
    data: {
      orderNo: 'VERIFY-' + Date.now().toString().slice(-8),
      userId: cust.id,
      status: 'pending',
      subtotal: 15900,
      total: 15900,
      items: {
        create: {
          productId: prod.id,
          name: prod.name,
          price: 15900,
          quantity: 1,
        },
      },
    },
  });
  order = created;
  console.log('created order', order.orderNo);
} else {
  console.log('order exists', order.orderNo);
}

// 5) 客服账号
let agent = await prisma.chatAgent.findFirst({ where: { username: 'verify' } });
if (!agent) {
  agent = await prisma.chatAgent.create({
    data: {
      username: 'verify',
      displayName: '검증상담원',
      passwordHash: hash,
      permissions: 'support_basic',
      active: true,
    },
  });
  console.log('created agent', agent.id);
} else {
  console.log('agent exists', agent.id);
}

console.log('\n--- SUMMARY ---');
console.log('customer:', cust.email);
console.log('admin2:', admin2.email, admin2.staffRole);
console.log('product:', prod.slug, prod.id);
console.log('order:', order.orderNo);
console.log('agent:', agent.username);

await prisma.$disconnect();
