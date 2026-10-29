'use client';

// 客服 REST 封装：历史拉取、建会话、兜底发送、已读、状态、图片上传。
// WebSocket 为主路径；断线时前端用这些接口 + 轮询作为兜底。

import type { ChatMsg } from './chat-ws';

async function toJson(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
  }
  return res.json();
}

export async function createConversation(data: {
  visitorName?: string;
  contactType: 'email' | 'phone' | 'none';
  contact?: string;
  locale: string;
}) {
  return toJson(
    await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );
}

export async function listConversations() {
  return toJson(await fetch('/api/chat/conversations', { cache: 'no-store' }));
}

export async function getConversation(id: string, guest?: string) {
  const q = guest ? `?guest=${encodeURIComponent(guest)}` : '';
  return toJson(await fetch(`/api/chat/conversations/${id}${q}`, { cache: 'no-store' }));
}

export async function sendMessageRest(data: {
  conversationId: string;
  content?: string;
  imageUrl?: string;
  /** 附带的商品 slug（访客把商品发给客服时携带） */
  productSlug?: string;
  guest?: string;
  clientId?: string;
}) {
  return toJson(
    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );
}

export async function markRead(id: string, guest?: string) {
  const q = guest ? `?guest=${encodeURIComponent(guest)}` : '';
  return toJson(
    await fetch(`/api/chat/conversations/${id}${q}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
  );
}

export async function setStatus(id: string, status: 'open' | 'closed') {
  return toJson(
    await fetch(`/api/chat/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  );
}

export async function uploadImage(file: File, guest?: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const q = guest ? `?guest=${encodeURIComponent(guest)}` : '';
  const d = await toJson(await fetch(`/api/chat/upload${q}`, { method: 'POST', body: fd }));
  return d.url;
}

export type { ChatMsg };
