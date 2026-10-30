/**
 * 聊天正文链接解析 —— 纯函数，无 React 依赖，可被服务端/客户端/测试直接引用。
 *
 * 背景（2026-10-30 实测）：
 *   访客把商品链接从微信/浏览器直接粘进聊天框时，正文原本是一段纯文本，
 *   客服没法点开，只能手动复制到地址栏 —— 而链接里写死的对外域名
 *   （www.mk.golf）一旦 DNS/证书有问题，粘过去也是打不开。
 *
 * 规则：
 *   · 本站商品链接（/{locale}/products/{slug}）→ 转成**站内相对路径**再跳，
 *     跟随客服当前访问的主机，必定能打开
 *   · 其它外站链接 → 原样保留，新窗口打开
 *
 * ⚠️ 只做解析与渲染决策，不改消息存储内容（库里仍存客户原文）。
 */

/** 正则：正文里的 http/https 链接（排除中英文标点，避免把句号吃进链接） */
export const URL_RE = /https?:\/\/[^\s<>"'，。；、）)\]】」]+/gi;

/** 商品路径：/{locale}/products/{slug} */
const PRODUCT_PATH_RE = /^\/(ko|zh|en)\/products\/([a-z0-9][a-z0-9_-]{1,80})$/i;

/** 从完整 URL 里抽站内商品路径 */
function productPathOf(pathname: string): string | null {
  const m = pathname.match(PRODUCT_PATH_RE);
  if (!m) return null;
  return `/${m[1].toLowerCase()}/products/${m[2].toLowerCase()}`;
}

/**
 * 把一个链接解析成可点击的目标。
 * @returns href 最终跳转地址；external 是否是外站（外站要 target=_blank）
 */
export function resolveChatLink(raw: string): { href: string; external: boolean } {
  // 1) 完整 URL → 抽路径
  const abs = raw.match(/^https?:\/\/[^/?#]*(\/[^?#]*)?/i);
  if (abs) {
    const path = abs[1] || '/';
    const p = productPathOf(path);
    if (p) return { href: p, external: false };
    return { href: raw, external: true };
  }
  // 2) 已经是站内相对商品路径
  const p2 = productPathOf(raw);
  if (p2) return { href: p2, external: false };
  // 3) 其它 → 原样
  return { href: raw, external: true };
}

/**
 * 把正文切成片段序列，供 UI 渲染。
 * @returns Array<{ type: 'text' | 'link'; value: string; href?: string; external?: boolean }>
 */
export type MessageChunk =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string; external: boolean };

export function splitMessageContent(content: string): MessageChunk[] {
  if (!content) return [];
  const out: MessageChunk[] = [];
  let lastIndex = 0;

  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(content)) !== null) {
    const raw = m[0];
    const start = m.index;
    if (start > lastIndex) {
      out.push({ type: 'text', value: content.slice(lastIndex, start) });
    }
    const { href, external } = resolveChatLink(raw);
    out.push({ type: 'link', value: raw, href, external });
    lastIndex = start + raw.length;
  }
  if (lastIndex < content.length) {
    out.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return out;
}
