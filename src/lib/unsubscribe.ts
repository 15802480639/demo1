/**
 * 退订链接签名 —— 一键退订必须防篡改（否则任何人能拿别人的邮箱退订）。
 * 做法：HMAC-SHA256(邮箱, AUTH_SECRET)，截断为 32 位 hex，与邮箱一起放在 URL 里。
 * 服务端只校验签名，不查库不比对明文，避免泄露邮箱。
 */
import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'dev-insecure-secret-change-me';

/** 为邮箱生成退订 token */
export function signUnsubscribe(email: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`unsub:${email.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

/** 校验邮箱与 token 是否匹配 */
export function verifyUnsubscribe(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expect = signUnsubscribe(email);
  // 定长比较，避免时序侧信道
  if (expect.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** 拼出完整退订 URL */
export function unsubscribeUrl(baseUrl: string, email: string): string {
  const clean = baseUrl.replace(/\/$/, '');
  const q = new URLSearchParams({ email: email.toLowerCase().trim(), t: signUnsubscribe(email) });
  return `${clean}/api/newsletter/unsubscribe?${q.toString()}`;
}