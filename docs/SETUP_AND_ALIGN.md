# WebShopp — 全功能海外电商商城（框架骨架）

> 技术栈：Next.js 16 (App Router, src 目录) + React 19 + TypeScript + Tailwind CSS 4
> 定位：面向海外、Google 收录优先、全自研（前后端一体）
> 状态：**框架骨架已完成，UI 待套参考图**

---

## 一、已搭好的基础

### SEO 基建（Google 收录优先）
- `src/app/layout.tsx`：默认 metadata 模板（title 模板、Open Graph、Twitter、canonical、robots）
- `src/app/sitemap.ts`：动态 sitemap（静态路由已列，动态商品/分类 URL 待接 DB）
- `src/app/robots.ts`：robots 协议（屏蔽 /admin、/account、/cart、/checkout、/api）
- `src/components/seo/json-ld.tsx` + `src/lib/seo.ts`：JSON-LD 生成器（Organization / Breadcrumb / Product / ItemList）
- `src/lib/site.ts`：站点配置（品牌名、域名、文案，**待确认**）

### 数据层（Prisma + PostgreSQL）
- `prisma/schema.prisma`：全功能模型
  - User / Address
  - Category（支持多级分类树）/ Brand
  - Product / Sku（规格 + 库存）
  - Cart / CartItem
  - Order / OrderItem
  - Coupon（优惠券）/ Review（评价）/ Shipment（物流）
- `src/lib/prisma.ts`：PrismaClient 单例
- `.env.example`：环境变量样例（DATABASE_URL / 站点 URL / Stripe / AUTH_SECRET）

### 前端路由占位
| 路由 | 说明 |
|------|------|
| `/` | 首页（Hero + 分类入口 + 精选商品，已含 JSON-LD） |
| `/products` | 商品列表（筛选侧栏占位） |
| `/products/[slug]` | 商品详情（含 generateMetadata + Product JSON-LD） |
| `/categories` | 分类列表 |
| `/categories/[slug]` | 分类详情 |
| `/search` | 搜索（noindex） |
| `/cart` / `/checkout` | 购物车 / 结算（noindex） |
| `/account` / `/account/orders` | 账户 / 我的订单（noindex） |
| `/wishlist` | 收藏（noindex） |
| `/contact` `/faq` `/privacy` `/terms` | 法律/支持页 |

### 后台框架（/admin，noindex）
- 独立侧边栏布局 + 仪表盘 / 商品 / 订单 / 客户 / 登录 占位页

---

## 二、全功能模块清单（✅ 骨架 / 🔴 待实现）

| 模块 | 状态 |
|------|------|
| 商品管理（SPU/SKU、图片、库存） | ✅ 模型 / 🔴 后台 CRUD + 前台渲染 |
| 多级分类 | ✅ 模型 / 🔴 前台树 + 筛选 |
| 购物车 | ✅ 路由 / 🔴 状态管理（Context/Cookie）+ 结算流 |
| 订单与状态机 | ✅ 模型 / 🔴 下单 + 支付回调 |
| 支付（Stripe，海外为主） | 🔴 待接入（需 Key） |
| 会员/账户 | ✅ 路由 / 🔴 注册登录 + 鉴权 |
| 优惠券/促销 | ✅ 模型 / 🔴 计算逻辑 |
| 评价系统 | ✅ 模型 / 🔴 前台提交 + 评分聚合 |
| 物流跟踪 | ✅ 模型 / 🔴 对接承运商 API |
| 搜索 | ✅ 路由 / 🔴 查询（DB 模糊 / Algolia） |
| 后台管理 | ✅ 布局 / 🔴 各页 CRUD |
| SEO 基建 | ✅ metadata/sitemap/robots/JSON-LD |

---

## 三、待你确认的对齐清单 ❓

1. **品牌名 / 正式域名** —— 写进 `src/lib/site.ts` 与 `.env` 的 `NEXT_PUBLIC_SITE_URL`
2. **UI 参考商城** —— 你答应发图，我据此重构首页与商品页视觉（当前是占位骨架）
3. **数据库部署方式** —— 本地 PG？还是云（Supabase / Neon，海外低延迟推荐）
4. **支付** —— Stripe 测试 Key 何时给？是否还需要 PayPal
5. **是否需要多语言** —— 海外为主是否要中/英双语 + hreflang（目前结构已预留）
6. **鉴权方案** —— 自研 session 还是 NextAuth
7. **是否需要 PWA / 多货币切换 UI**

---

## 四、本地运行

```bash
# 1. 安装依赖（已装 next/react/tailwind/prisma）
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 DATABASE_URL 等

# 3. 初始化数据库
npx prisma generate
npx prisma migrate dev --name init

# 4. 启动
npm run dev      # http://localhost:3000
npm run build    # 生产构建校验
```

---

## 五、下一步（等你发 UI 参考图后）
1. 按参考图重做首页 / 商品详情 / 列表视觉
2. 接 Prisma 把占位页变成真实数据
3. 购物车 + 结算 + Stripe 支付闭环
4. 后台 CRUD 打通
5. 提交 sitemap 到 Google Search Console，做收录验证
