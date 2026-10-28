// 邀请码工具 —— 生成唯一邀请码、以及「按需补发」已注册老用户的邀请码。
// 规则（与用户拍板一致）：仅 1 级（直接上级），先只记录关系、不送奖励。
import { prisma } from '@/lib/prisma';

const PREFIX = 'JND-';
// 去掉易混淆字符：0/O、1/I/L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LEN = 6;

function randomCode(): string {
  let s = '';
  for (let i = 0; i < LEN; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return PREFIX + s;
}

/** 生成一个当前库里不重复的邀请码（碰撞自动重试）。 */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode();
    const existing = await prisma.user.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  // 极端兜底：用时间戳熵，几乎不会走到
  return PREFIX + Date.now().toString(36).toUpperCase().slice(-LEN);
}

/**
 * 取用户邀请码；若老用户尚未分配（注册前历史数据），自动补发一个。
 * 用于「我的账户」页面自愈展示。并发安全：唯一索引冲突时重试。
 */
export async function getOrCreateInviteCode(userId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    });
    if (!user) return null;
    if (user.inviteCode) return user.inviteCode;
    const code = await generateUniqueInviteCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { inviteCode: code },
        select: { inviteCode: true },
      });
      return updated.inviteCode;
    } catch {
      // 唯一索引冲突（另一请求抢先写入），重试
    }
  }
  return null;
}

/**
 * 解析上级邀请码，返回上级用户 id。
 * 找不到匹配码时返回 null（静默忽略，不阻断注册）。
 */
export async function resolveUpline(raw?: unknown): Promise<string | null> {
  if (!raw) return null;
  const code = String(raw).trim().toUpperCase();
  if (!code) return null;
  const upline = await prisma.user.findUnique({
    where: { inviteCode: code },
    select: { id: true, invitedById: true },
  });
  if (!upline) return null;
  // 防止自邀 / 循环（这里只有 1 级，简单校验：不能把自己的码填成上级）
  return upline.id;
}
