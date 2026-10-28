import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireAdmin, HttpError } from '@/lib/auth';

// POST /api/chat/messages —— 兜底发送（主路径是 WebSocket，断线时由前端用此接口 + 轮询）
// 管理员或会话所属访客均可调用。返回落库后的消息。
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const conversationId = String(body.conversationId || '');
  const content = typeof body.content === 'string' ? body.content.slice(0, 4000).trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 2000) : '';
  if (!conversationId || (!content && !imageUrl)) {
    return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
  }

  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  let sender: 'admin' | 'visitor';

  if (isAdmin) {
    try {
      await requireAdmin();
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    }
    sender = 'admin';
  } else {
    const guest = typeof body.guest === 'string' ? body.guest : null;
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { guestToken: true },
    });
    if (!conv || !guest || conv.guestToken !== guest) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    sender = 'visitor';
  }

  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });
  if (!conv) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const msg = await prisma.chatMessage.create({
    data: { conversationId, sender, content: content || null, imageUrl: imageUrl || null },
  });
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: msg.id,
      sender: msg.sender,
      content: msg.content,
      imageUrl: msg.imageUrl,
      read: msg.read,
      createdAt: msg.createdAt,
    },
  });
}
