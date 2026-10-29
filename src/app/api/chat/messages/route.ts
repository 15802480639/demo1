import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isoUtcSql } from '@/lib/chat-time';
import { broadcastChatMessage } from '@/lib/chat-broadcast';
import { resolveStaff } from '@/lib/chat-staff';

// POST /api/chat/messages —— 兜底发送（主路径是 WebSocket，断线时由前端用此接口 + 轮询）
// 客服（admin/agent）或会话所属访客均可调用。返回落库后的消息。
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
  const clientId =
    typeof body.clientId === 'string' && body.clientId.trim() ? body.clientId.trim() : undefined;
  if (!conversationId || (!content && !imageUrl)) {
    return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
  }

  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  // 客服身份：admin（后台）或 agent（H5 客服）
  const staff = isAdmin ? null : await resolveStaff();
  let sender: 'admin' | 'visitor';
  /** 实际回复人身份键（仅客服侧有值），用于归属统计 */
  let sentByStaffId: string | null = null;

  if (isAdmin || staff) {
    sender = 'admin';
    sentByStaffId = isAdmin ? `admin:${session!.id}` : staff!.staffId;
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

  // 幂等：同一 clientId 重复提交（WS 超时后 REST 补发）→ 返回已存在的那条，不重复落库
  if (clientId) {
    const existing = await prisma.chatMessage.findUnique({
      where: { conversationId_clientId: { conversationId, clientId } },
    });
    if (existing) {
      const [row] = await prisma.$queryRaw<{ createdAt: string }[]>`
        SELECT ${isoUtcSql('"createdAt"')} AS "createdAt"
        FROM "ChatMessage" WHERE "id" = ${existing.id}
      `;
      return NextResponse.json({
        message: {
          id: existing.id,
          sender: existing.sender,
          content: existing.content,
          imageUrl: existing.imageUrl,
          read: existing.read,
          createdAt: row?.createdAt ?? existing.createdAt,
          clientId: existing.clientId,
          seq: existing.seq,
        },
        duplicate: true,
      });
    }
  }

  const msg = await prisma.chatMessage.create({
    data: {
      conversationId,
      sender,
      content: content || null,
      imageUrl: imageUrl || null,
      sentByStaffId,
      ...(clientId ? { clientId } : {}),
    },
  });
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // 取字面 UTC ISO 字符串（与 WS 推送格式一致，见 src/lib/chat-time.ts）
  const [row] = await prisma.$queryRaw<{ createdAt: string }[]>`
    SELECT ${isoUtcSql('"createdAt"')} AS "createdAt"
    FROM "ChatMessage" WHERE "id" = ${msg.id}
  `;

  const payload = {
    id: msg.id,
    sender: msg.sender,
    content: msg.content,
    imageUrl: msg.imageUrl,
    read: msg.read,
    createdAt: row?.createdAt ?? msg.createdAt,
    clientId: msg.clientId,
    seq: msg.seq,
  };

  // ⭐ 通知 WS 进程广播：REST 兜底路径的消息也要让对方秒到，
  //    否则对方只能靠 3 秒轮询才看见（表现为"不实时"）。
  await broadcastChatMessage(conversationId, payload);

  return NextResponse.json({ message: payload });
}
