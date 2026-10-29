import type { Metadata } from 'next';
import '../app.css';
import { csDict } from '@/lib/cs-dict';

// ⭐ H5 客服台的独立布局 —— 故意不放在 [locale] 路由树下：
//   1) 纯净全屏，不继承商城的顶栏/底栏/访客客服悬浮球（手机上太挤）
//   2) 不带语言前缀，客服是内部人员，界面固定韩文，无需多语言切换
//   3) robots 屏蔽，避免内部工具被搜索引擎收录
export const metadata: Metadata = {
  title: csDict.workbenchTitle,
  description: '실시간 상담원 작업대',
  robots: { index: false, follow: false, nocache: true },
  // 内部工具：禁止被 iframe 嵌套（防点击劫持）
  other: { 'x-frame-options': 'SAMEORIGIN' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // 移动端输入框不被键盘顶飞
  viewportFit: 'cover',
};

export default function CsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#1a1714" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
