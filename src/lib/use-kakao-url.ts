'use client';

import { useEffect, useState } from 'react';

const CACHE_KEY = 'kakao_consult_url';
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟，避免后台改链接后长时间不生效

/**
 * 取当前配置的 Kakao 咨询链接。
 * - 返回空串 = 未配置，调用方应隐藏 Kakao 入口（绝不退回到任何默认链接）
 * - 10 分钟本地缓存，减少页面切换时的重复请求
 */
export function useKakaoUrl(): string {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let alive = true;

    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { url: string; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setUrl(parsed.url);
          return;
        }
      }
    } catch {
      // sessionStorage 不可用（隐私模式等）则直接请求
    }

    fetch('/api/kakao')
      .then((r) => r.json())
      .then((d: { url?: string }) => {
        if (!alive) return;
        const v = typeof d?.url === 'string' ? d.url : '';
        setUrl(v);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ url: v, ts: Date.now() }));
        } catch {
          // 忽略写入失败
        }
      })
      .catch(() => {
        /* 网络失败时保持空串，入口不显示 */
      });

    return () => {
      alive = false;
    };
  }, []);

  return url;
}