// 后台权限矩阵 —— 管理员与客服的权限分级单一事实源
//
// ⭐ 为什么不用 User.role 承载分级：
//   role 被全站 30+ 处 `role !== 'admin'` 依赖，塞进更多值会连环炸。
//   所以 role 只保留 customer | admin 两种"是不是后台账号"，
//   真正的"能干什么"放在独立的 staffRole 字段（见 prisma/schema.prisma）。
//   好处：向后兼容、改权限立即生效（不用重新登录）。
//
// ⭐ 为什么权限要按「动作」而不是按「页面」定义：
//   只按页面分会漏掉跨页面的越权操作（例如能看订单页 ≠ 能改订单状态）。
//   这里定义细粒度动作（orders.edit），页面只是动作的集合。

/** 后台管理员权限档位 */
export const STAFF_ROLES = [
  'owner', // 站长/所有者：全部权限
  'admin', // 管理员：除「权限管理」外全部
  'order', // 订单专员：只管订单/物流/客户查询
  'product', // 商品专员：只管商品/分类/品牌/库存
  'support', // 客服主管：只管客服会话/咨询/客户查询
  'finance', // 财务：只管订单查询/积分/报表导出
  'viewer', // 只读：什么都看，什么都不能改
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** 后台可执行的动作（权限点） */
export const PERMISSIONS = [
  // 概览
  'dashboard.view',
  // 商品
  'products.view',
  'products.edit',
  'products.import', // Excel 批量导入
  'products.delete',
  'categories.edit',
  'brands.edit',
  // 订单
  'orders.view',
  'orders.edit', // 改状态 / 物流单号
  'orders.export', // 导出订单
  // 客户
  'customers.view',
  'customers.edit',
  'customers.points', // 手动加减积分
  // 咨询 & 客服
  'chat.view',
  'chat.reply',
  'consultations.view',
  'consultations.edit',
  'agents.manage', // 客服账号增删改
  // 营销
  'coupons.edit',
  'newsletter.edit',
  'newsletter.send',
  'referrals.view',
  // 积分
  'points.view',
  'points.manage',
  // 内容 & SEO
  'content.edit',
  'seo.edit',
  'geo.edit',
  // 数据
  'reports.view', // 销售报表
  'data.export', // 导出会员/销售数据
  // 系统
  'audit.view', // 操作日志
  'staff.manage', // 管理员权限分配（只有 owner）
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** 各档位的权限集合 */
const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== 'staff.manage'),
  order: [
    'dashboard.view',
    'orders.view',
    'orders.edit',
    'orders.export',
    'customers.view',
    'products.view',
    'chat.view',
    'chat.reply',
    'consultations.view',
    'referrals.view',
    'data.export',
    'reports.view',
    'points.view',
  ],
  product: [
    'dashboard.view',
    'products.view',
    'products.edit',
    'products.import',
    'products.delete',
    'categories.edit',
    'brands.edit',
    'orders.view',
    'reports.view',
    'audit.view',
  ],
  support: [
    'dashboard.view',
    'chat.view',
    'chat.reply',
    'consultations.view',
    'consultations.edit',
    'orders.view',
    'customers.view',
    'products.view',
    'agents.manage',
    'newsletter.edit',
  ],
  finance: [
    'dashboard.view',
    'orders.view',
    'orders.export',
    'customers.view',
    'customers.points',
    'reports.view',
    'data.export',
    'coupons.edit',
    'points.view',
    'points.manage',
    'newsletter.edit',
  ],
  viewer: [
    'dashboard.view',
    'products.view',
    'orders.view',
    'customers.view',
    'chat.view',
    'consultations.view',
    'referrals.view',
    'reports.view',
    'points.view',
  ],
};

/** 权限档位的中英文名（后台展示用） */
export const STAFF_ROLE_LABELS: Record<StaffRole, { ko: string; zh: string; en: string }> = {
  owner: { ko: '소유자', zh: '所有者', en: 'Owner' },
  admin: { ko: '관리자', zh: '管理员', en: 'Admin' },
  order: { ko: '주문 담당', zh: '订单专员', en: 'Order Staff' },
  product: { ko: '상품 담당', zh: '商品专员', en: 'Product Staff' },
  support: { ko: '고객지원 책임자', zh: '客服主管', en: 'Support Lead' },
  finance: { ko: '재무 담당', zh: '财务专员', en: 'Finance Staff' },
  viewer: { ko: '읽기 전용', zh: '只读', en: 'Read Only' },
};

/** 归一化：非法/空档位一律按 owner 处理（向后兼容：老账号没 staffRole 字段时） */
export function normalizeStaffRole(role?: string | null): StaffRole {
  if (!role) return 'owner';
  const r = String(role) as StaffRole;
  return STAFF_ROLES.includes(r) ? r : 'owner';
}

/** 判断某个档位是否拥有某权限 */
export function roleHasPermission(role: string | null | undefined, perm: Permission): boolean {
  const r = normalizeStaffRole(role);
  return ROLE_PERMISSIONS[r].includes(perm);
}

/** 取某档位的完整权限列表 */
export function permissionsOf(role: string | null | undefined): Permission[] {
  return [...ROLE_PERMISSIONS[normalizeStaffRole(role)]];
}

// ---------------- 客服（H5 端）权限 ----------------

/**
 * 客服档位 —— 与后台管理员是两套体系，互不影响。
 * 客服账号存在 ChatAgent 表，permissions 字段存这里的档位名。
 */
export const AGENT_ROLES = [
  'support_basic', // 只接待（默认，最保守）
  'support_order', // 接待 + 可查订单/商品
  'support_full', // 接待 + 可查订单/商品 + 可改订单状态与物流
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

/** 客服可执行的动作 */
export const AGENT_PERMISSIONS = [
  'agent.chat', // 收发消息（所有客服都有）
  'agent.orders.view', // 查订单
  'agent.products.view', // 查商品
  'agent.orders.edit', // 改订单状态 / 物流
] as const;

export type AgentPermission = (typeof AGENT_PERMISSIONS)[number];

export const AGENT_ROLE_PERMISSIONS: Record<AgentRole, AgentPermission[]> = {
  support_basic: ['agent.chat'],
  support_order: ['agent.chat', 'agent.orders.view', 'agent.products.view'],
  support_full: [
    'agent.chat',
    'agent.orders.view',
    'agent.products.view',
    'agent.orders.edit',
  ],
};

export const AGENT_ROLE_LABELS: Record<AgentRole, { ko: string; zh: string; en: string }> = {
  support_basic: { ko: '기본 응대', zh: '基础接待', en: 'Basic' },
  support_order: { ko: '주문 조회 가능', zh: '可查订单', en: 'Order Viewer' },
  support_full: { ko: '주문 처리 가능', zh: '可处理订单', en: 'Order Handler' },
};

export function normalizeAgentRole(role?: string | null): AgentRole {
  if (!role) return 'support_basic';
  const r = String(role) as AgentRole;
  return AGENT_ROLES.includes(r) ? r : 'support_basic';
}

export function agentHasPermission(
  role: string | null | undefined,
  perm: AgentPermission
): boolean {
  return AGENT_ROLE_PERMISSIONS[normalizeAgentRole(role)].includes(perm);
}
