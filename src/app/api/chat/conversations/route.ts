import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSession, requireAdmin, HttpError } from '@/lib/auth';

// GET /api/chat/conversations —— 管理员拉取会话列表（含未读数与末条预览）
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const convs = await prisma.chatConversation.findMany({
    orderBy: { lastMessageAt: 'desc' },
    include: {
      user: { select: { name: true, username: true, email: true } },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  });

  const ids = convs.map((c) => c.id);
  const unread = ids.length
    ? await prisma.chatMessage.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: ids }, sender: 'visitor', read: false },
        _count: true,
      })
    : [];
  const unreadMap = Object.fromEntries(unread.map((u) => [u.conversationId, u._count]));

  const rows = convs.map((c) => {
    const last = c.messages[0];
    return {
      id: c.id,
      visitorName: c.visitorName,
      contactType: c.contactType,
      contact: c.contact,
      status: c.status,
      locale: c.locale,
      lastMessageAt: c.lastMessageAt,
      unreadAdmin: unreadMap[c.id] || 0,
      lastPreview: last ? (last.content || (last.imageUrl ? '[image]' : '')) : '',
      lastSender: last?.sender || null,
      user: c.user
        ? { name: c.user.name, username: c.user.username, email: c.user.email }
        : null,
    };
  });

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
