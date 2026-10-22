/**
 * 邮件模板预览（独立实现，不依赖构建产物）—— 用于本地肉眼确认排版。
 * 用法：node scripts/preview-newsletter.mjs   → 生成 preview-mail-{ko,zh,en}.html
 * ⚠️ 模板逻辑与 src/lib/mail-template.ts 保持一致；改模板时两边同步。
 */
import { writeFileSync } from 'node:fs';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const UI = {
  ko: { unsub: '구독 해제', viewSite: '웹사이트에서 보기', footer: '본 이메일은 J&D 구독 newsletter를 신청하신 분에게만 발송됩니다.', preheader: 'J&D 새로운 소식' },
  zh: { unsub: '退订', viewSite: '在网站查看', footer: '本邮件仅发送给订阅 J&D 电子报的用户。', preheader: 'J&D 最新消息' },
  en: { unsub: 'Unsubscribe', viewSite: 'View on website', footer: 'You are receiving this email because you subscribed to the J&D newsletter.', preheader: 'Latest from J&D' },
};

function bodyToHtml(body) {
  return String(body ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 18px;font-size:15px;line-height:1.9;color:#33322e;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function render({ locale, subject, body, unsubscribeUrl, siteUrl, logoUrl }) {
  const ui = UI[locale] ?? UI.en;
  const logo = `<img src="${escapeHtml(logoUrl)}" alt="J&D" width="120" style="display:block;height:auto;border:0;" />`;
  return `<!DOCTYPE html>
<html lang="${locale}"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f3ef;">
<div style="display:none;font-size:1px;color:#f4f3ef;">${escapeHtml(ui.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ef;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e6e3dc;">
<tr><td style="padding:28px 32px 18px;border-bottom:1px solid #eeebe4;">${logo}</td></tr>
<tr><td style="padding:28px 32px 8px;">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.5;color:#111110;">${escapeHtml(subject)}</h1>
${bodyToHtml(body)}</td></tr>
<tr><td align="center" style="padding:12px 32px 28px;">
<a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:13px 30px;background:#111110;color:#ffffff;font-size:14px;letter-spacing:1px;text-decoration:none;">${escapeHtml(ui.viewSite)}</a>
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #eeebe4;">
<p style="margin:0 0 10px;font-size:12px;line-height:1.8;color:#8a8780;">${escapeHtml(ui.footer)}</p>
<p style="margin:0;font-size:12px;line-height:1.8;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#8a8780;text-decoration:underline;">${escapeHtml(ui.unsub)}</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

const BASE = 'http://127.0.0.1:3000';
const LOGO = `${BASE}/brand/jnd-logo.png`;
const UNSUB = `${BASE}/api/newsletter/unsubscribe?email=test%40example.com&t=0123456789abcdef0123456789abcdef`;

const cases = [
  { locale: 'ko', subject: 'J&D 겨울 신제품 공개', body: '안녕하세요, J&D입니다.\n\n이번 겨울 컬렉션이 정식으로 공개되었습니다. 기능성 무드 테크와 루프 니트 폴로로 구성했습니다.\n\n온라인몰에서 전체 상품을 확인해 보세요.' },
  { locale: 'zh', subject: 'J&D 冬季新品上市', body: '你好，这里是 J&D。\n\n冬季系列正式上线，涵盖多款防风外套与针织 polo。\n\n点击下方按钮回到网站选购。' },
  { locale: 'en', subject: 'J&D Winter Collection', body: 'Hello from J&D.\n\nOur winter collection is now live, featuring windbreakers and knit polos.\n\nVisit our store to shop the full range.' },
];

for (const c of cases) {
  const html = render({ ...c, unsubscribeUrl: UNSUB, siteUrl: BASE, logoUrl: LOGO });
  const f = `preview-mail-${c.locale}.html`;
  writeFileSync(f, html, 'utf8');
  console.log(`✓ ${f}`);
}
console.log('\n用浏览器打开任意一个 html 即可查看排版；' );
console.log('图片 logo 需先启动本地服务（http://127.0.0.1:3000）才会显示。');