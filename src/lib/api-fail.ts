// 后台 API 统一错误出口
//
// ⭐ 为什么需要它：
//   requirePermission() / requireUser() 抛的是 HttpError（带 status）。
//   如果 route 里不显式捕获，异常会冒泡到 Next.js 框架 → 一律返回 500，
//   把「没权限」伪装成「服务器炸了」，前端分不清、监控也误报。
//   所有后台 route 都用 apiFail(e) 兜底：HttpError → 原状态码，其余 → 500。

import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/auth';

/** 把异常转成 JSON 响应 */
export function apiFail(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error('[api] unhandled error:', e);
  return NextResponse.json({ error: 'server_error' }, { status: 500 });
}
