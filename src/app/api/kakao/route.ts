import { NextResponse } from 'next/server';
import { getKakaoUrl } from '@/lib/kakao';

/**
 * 公开只读接口：返回当前配置的 Kakao 咨询链接。
 * 前端是 client component，拿不到 server 侧的 getKakaoUrl()，故走此接口。
 * 未配置时返回空串 —— 前端据此隐藏 Kakao 入口。
 */
export async function GET() {
  return NextResponse.json({ url: await getKakaoUrl() });
}