'use client';

import { Fragment, type ReactNode } from 'react';
import { splitMessageContent } from '@/lib/chat-message-text';

/**
 * 聊天消息正文渲染 —— 把正文里的 URL 变成可点击链接。
 *
 * 解析逻辑全在 src/lib/chat-message-text.ts（纯函数，可单测）；
 * 这里只负责渲染。
 *
 * 详见该文件顶部的背景说明（2026-10-30 商品链接打不开的修复）。
 */

export function ChatMessageText({
  content,
  className = 'whitespace-pre-wrap break-words',
}: {
  content: string;
  className?: string;
}) {
  const chunks = splitMessageContent(content);

  return (
    <span className={className}>
      {chunks.map((c, i) =>
        c.type === 'text' ? (
          <Fragment key={i}>{c.value}</Fragment>
        ) : (
          <a
            key={i}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all hover:opacity-80"
          >
            {c.value}
          </a>
        )
      )}
    </span>
  );
}
