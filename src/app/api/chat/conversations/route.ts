import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSession, requireAdmin, HttpError } from '@/lib/auth';
import { isoUtcSql } from '@/lib/chat-time';
import { requireStaff, unreadByStaff } from '@/lib/chat-staff';

// GET /api/chat/conversations —— 客服拉取会话列表（含未读数与末条预览）
// 权限：后台管理员（admin）或 H5 客服（agent）均可
export async function GET() {
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // ⚠️ 用 raw 查询取字面 UTC ISO 字符串：Prisma adapter 读 timestamptz 会按会话时区
  //    壁钟解读（实测多 9 小时），与 WS 推送时间不一致会导致前端排序错乱。
  const convs = await prisma.$queryRaw<
    {
      id: string;
      visitorName: string | null;
      contactType: string;
      contact: string | null;
      status: string;
      locale: string;
      lastMessageAt: string;
      userName: string | null;
      userUsername: string | null;
      userEmail: string | null;
      lastContent: string | null;
      lastImageUrl: string | null;
      lastSender: string | null;
    }[]
  >`
    SELECT c."id",
           c."visitorName",
           c."contactType",
           c."contact",
           c."status",
           c."locale",
           ${isoUtcSql('c."lastMessageAt"')} AS "lastMessageAt",
           u."name"     AS "userName",
           u."username" AS "userUsername",
           u."email"    AS "userEmail",
           lm."content"   AS "lastContent",
           lm."imageUrl"  AS "lastImageUrl",
           lm."sender"    AS "lastSender"
    FROM "ChatConversation" c
    LEFT JOIN "User" u ON u."id" = c."userId"
    LEFT JOIN LATERAL (
      SELECT m."content", m."imageUrl", m."sender"
      FROM "ChatMessage" m
      WHERE m."conversationId" = c."id"
      ORDER BY m."seq" DESC
      LIMIT 1
    ) lm ON true
    ORDER BY c."lastMessageAt" DESC
  `;

  // 未读数按当前客服各自的已读游标计算（A 看了不影响 B 的红点）
  const ids = convs.map((c) => c.id);
  const unreadMap = await unreadByStaff(ids, staff.staffId);

  const rows = convs.map((c) => ({
    id: c.id,
    visitorName: c.visitorName,
    contactType: c.contactType,
    contact: c.contact,
    status: c.status,
    locale: c.locale,
    lastMessageAt: c.lastMessageAt,
    unreadAdmin: unreadMap.get(c.id) || 0,
    lastPreview: c.lastContent || (c.lastImageUrl ? '[image]' : ''),
    lastSender: c.lastSender || null,
    user:
      c.userName || c.userUsername || c.userEmail
        ? { name: c.userName, username: c.userUsername, email: c.userEmail }
        : null,
  }));

  return NextResponse.json({ conversations: rows });
}

// POST /api/chat/conversations —— 游客（或登录用户）新建会话，返回 id + guestToken
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const contactType = ['email', 'phone', 'none'].includes(body.contactType) ? body.contactType : 'none';
  const contact =
    contactType === 'none' ? null : String(body.contact || '').slice(0, 200) || null;
  const visitorName = body.visitorName ? String(body.visitorName).slice(0, 60) : null;
  const locale = ['ko', 'zh', 'en'].includes(body.locale) ? body.locale : 'ko';
  const guestToken = crypto.randomBytes(18).toString('hex');

  const session = await getSession();
  const userId = session?.role === 'customer' ? session.id : null;

  const conv = await prisma.chatConversation.create({
    data: {
      visitorName,
      contactType,
      contact,
      locale,
      guestToken,
      userId,
    },
  });

  return NextResponse.json({ id: conv.id, guestToken: conv.guestToken });
}
