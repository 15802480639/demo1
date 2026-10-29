import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isoUtcSql } from '@/lib/chat-time';
import { resolveStaff, advanceReadCursor } from '@/lib/chat-staff';

// 校验访客身份：URL 上的 ?guest= 必须与会话 guestToken 一致
async function verifyGuest(conversationId: string, guest: string | null) {
  if (!guest) return false;
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { guestToken: true },
  });
  return !!conv && conv.guestToken === guest;
}

// GET /api/chat/conversations/[id] —— 历史消息（客服[admin/agent] 或 会话所属访客）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const guest = req.nextUrl.searchParams.get('guest');

  // 客服身份：admin（后台）或 agent（H5）
  const staff = isAdmin ? null : await resolveStaff();

  if (!isAdmin && !staff && !(await verifyGuest(id, guest))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // ⚠️ 必须用 raw 查询取字面 UTC ISO 字符串：
  //    Prisma 的 adapter 读 timestamptz 会按会话时区壁钟解读（实测多 9 小时），
  //    与 WS 推送的时间不一致会导致前端排序错乱。to_char 在 SQL 层直接产出字符串。
  const [conv] = await prisma.$queryRaw<
    {
      id: string;
      visitorName: string | null;
      contactType: string;
      contact: string | null;
      status: string;
      locale: string;
      userName: string | null;
      userUsername: string | null;
      userEmail: string | null;
    }[]
  >`
    SELECT c."id",
           c."visitorName",
           c."contactType",
           c."contact",
           c."status",
           c."locale",
           u."name"   AS "userName",
           u."username" AS "userUsername",
           u."email"  AS "userEmail"
    FROM "ChatConversation" c
    LEFT JOIN "User" u ON u."id" = c."userId"
    WHERE c."id" = ${id}
  `;
  if (!conv) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  // 按 seq（单调序号，与时区无关）排序：同一毫秒内的多条消息也有确定先后
  const messages = await prisma.$queryRaw<
    {
      id: string;
      sender: string;
      content: string | null;
      imageUrl: string | null;
      read: boolean;
      clientId: string | null;
      seq: number;
      createdAt: string;
    }[]
  >`
    SELECT m."id",
           m."sender",
           m."content",
           m."imageUrl",
           m."read",
           m."clientId",
           m."seq",
           ${isoUtcSql('m."createdAt"')} AS "createdAt"
    FROM "ChatMessage" m
    WHERE m."conversationId" = ${id}
    ORDER BY m."seq" ASC
  `;

  return NextResponse.json({
    conversation: {
      id: conv.id,
      visitorName: conv.visitorName,
      contactType: conv.contactType,
      contact: conv.contact,
      status: conv.status,
      locale: conv.locale,
      user: conv.userName || conv.userUsername || conv.userEmail
        ? { name: conv.userName, username: conv.userUsername, email: conv.userEmail }
        : null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      imageUrl: m.imageUrl,
      read: m.read,
      createdAt: m.createdAt,
      clientId: m.clientId,
      seq: m.seq,
    })),
  });
}

// PATCH /api/chat/conversations/[id]
//  - 客服（admin/agent）：{status:'open'|'closed'} 改状态；或 {read:true} 推进已读游标
//  - 访客：{read:true}（需 ?guest=）标记客服消息已读
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const guest = req.nextUrl.searchParams.get('guest');
  const staff = isAdmin ? null : await resolveStaff();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 客服操作（后台管理员 或 H5 客服）
  if (isAdmin || staff) {
    const staffId = isAdmin ? `admin:${session!.id}` : staff!.staffId;
    if (body.read === true) {
      // ⭐ 未读按客服各算各的：推进"自己"的已读游标，不动别人的。
      //    同时把消息的 read 置 true（保留全局语义，供访客侧显示"客服已读"）。
      await advanceReadCursor(id, staffId);
      await prisma.chatMessage.updateMany({
        where: { conversationId: id, sender: 'visitor', read: false },
        data: { read: true },
      });
      return NextResponse.json({ ok: true });
    }
    if (body.status === 'open' || body.status === 'closed') {
      const conv = await prisma.chatConversation.update({
        where: { id },
        data: { status: body.status },
      });
      return NextResponse.json({ ok: true, status: conv.status });
    }
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  // 访客操作：仅允许标记已读，且须过 guest 校验
  if (!(await verifyGuest(id, guest))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (body.read === true) {
    await prisma.chatMessage.updateMany({
      where: { conversationId: id, sender: 'admin', read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
}
