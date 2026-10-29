// 访客身份校验 —— 站内实时客服「必须登录才能用」的核心规则
//
// 业务要求（子建 2026-10-29）：
//   客户使用实时客服前必须已在商城注册并登录；
//   未登录时只能看到「请登录 / 注册」引导，不能发消息；
//   聊天里显示的客户名称 = 客户的注册账号名。
//
// 因此会话与 User 表建立了强绑定：
//   · 建会话时写入 conv.userId，并把 conv.visitorName 设为注册账号名；
//   · 之后所有「访客侧」操作（拉历史 / 发消息 / 传图 / WS 连接）
//     都必须证明「我是这个会话的归属用户」。
//
// ⭐ 为什么保留 guestToken？
//   历史遗留会话（改版前由游客创建，userId 为 null）仍然只认 guestToken，
//   否则这批会话的历史消息将无法被任何一方读取。且 guestToken 是
//   36 位随机 hex，即便拿到也只能访问那一个会话，不构成横向越权。
//   新会话一律走 userId，guestToken 仅作附加校验。
import type { SessionUser } from '@/lib/auth';

/** 统一的会话归属判定结果 */
export type VisitorAccess = {
  ok: boolean;
  /** 归属用户（会话的 userId） */
  ownerId: string | null;
  /** 判定方式，便于日志排查 */
  via: 'owner' | 'guest' | 'none';
};

/**
 * 判断当前请求是否有权以「访客」身份访问某会话。
 *
 * @param convUserId  会话归属的 User.id（历史游客会话为 null）
 * @param guestToken  请求携带的访客令牌（用于历史游客会话）
 * @param session     当前登录会话（商城会员）
 * @param storedGuest 会话实际存的 guestToken
 */
export function judgeVisitorAccess(args: {
  convUserId: string | null;
  storedGuest: string | null;
  guestToken: string | null;
  session: SessionUser | null;
}): VisitorAccess {
  const { convUserId, storedGuest, guestToken, session } = args;

  // ① 已登录且是该会话的归属用户 → 放行（主路径）
  if (session && convUserId && session.id === convUserId) {
    return { ok: true, ownerId: convUserId, via: 'owner' };
  }

  // ② 历史游客会话：guestToken 匹配 → 放行（仅限这一个会话）
  if (!convUserId && guestToken && storedGuest && guestToken === storedGuest) {
    return { ok: true, ownerId: null, via: 'guest' };
  }

  return { ok: false, ownerId: convUserId, via: 'none' };
}

/**
 * 注册账号名 —— 会话里显示给客服的客户名称。
 * 优先用 username（注册时填写的账号），其次 name / email。
 * ⚠️ 这是「客户名称 = 注册账号名」规则的唯一出口，别处不要自己拼。
 */
export function visitorDisplayName(session: SessionUser): string {
  return session.username || session.name || session.email || 'customer';
}
