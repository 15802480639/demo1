import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireAdmin, HttpError } from '@/lib/auth';

// 校验访客身份：URL 上的 ?guest= 必须与会话 guestToken 一致
async function verifyGuest(conversationId: string, guest: string | null) {
  if (!guest) return false;
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { guestToken: true },
  });
  return !!conv && conv.guestToken === guest;
}

// GET /api/chat/conversations/[id] —— 历史消息（管理员 或 会话所属访客）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const guest = req.nextUrl.searchParams.get('guest');

  if (!isAdmin && !(await verifyGuest(id, guest))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const conv = await prisma.chatConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      user: { select: { name: true, username: true, email: true } },
    },
  });
  if (!conv) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json({
    conversation: {
      id: conv.id,
      visitorName: conv.visitorName,
      contactType: conv.contactType,
      contact: conv.contact,
      status: conv.status,
      locale: conv.locale,
      user: conv.user
        ? { name: conv.user.name, username: conv.user.username, email: conv.user.email }
        : null,
    },
    messages: conv.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      imageUrl: m.imageUrl,
      read: m.read,
      createdAt: m.createdAt,
    })),
  });
}

// PATCH /api/chat/conversations/[id]
//  - 管理员：{status:'open'|'closed'} 改状态；或 {read:true} 标记游客消息已读
//  - 访客：{read:true}（需 ?guest=）标记客服消息已读
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const guest = req.nextUrl.searchParams.get('guest');

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 管理员操作
  if (isAdmin) {
    try {
      await requireAdmin();
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (body.read === true) {
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
