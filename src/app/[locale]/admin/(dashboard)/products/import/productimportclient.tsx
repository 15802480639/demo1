'use client';

import { useRef, useState } from 'react';
import { useLocale } from '@/components/i18n/locale-provider';

type Result = {
  ok: boolean;
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string; name?: string }[];
  summary: string;
};

export function ProductImportClient() {
  const { locale, dict } = useLocale();
  const t = dict.admin;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState('');

  async function upload(dryRun: boolean) {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setErr(locale === 'zh' ? '请先选择 Excel 文件' : locale === 'en' ? 'Choose an Excel file first' : '먼저 엑셀 파일을 선택하세요');
      return;
    }
    setBusy(true);
    setErr('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      if (dryRun) fd.append('dryRun', '1');
      const res = await fetch('/api/admin/products/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(
          data?.errors?.map((e: { message: string }) => e.message).join('; ') ||
            data?.error ||
            'failed'
        );
        return;
      }
      setResult(data);
    } catch {
      setErr('failed');
    } finally {
      setBusy(false);
    }
  }

  const btn =
    'text-xs px-4 py-2 border border-line hover:border-accent text-accent disabled:opacity-50';

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t.impTitle}</h1>
        <p className="text-xs text-muted mt-1">{t.impIntro}</p>
      </div>

      {/* 模板下载 + 表头说明 */}
      <div className="border border-line p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <a
            href="/api/admin/products/import"
            className="text-xs px-3 py-1.5 border border-line hover:border-accent text-accent"
          >
            ↓ {t.impDownloadTpl}
          </a>
          <span className="text-[11px] text-muted">{t.impHint}</span>
        </div>
        <div className="text-[11px] text-muted leading-relaxed">
          <p>
            {t.impColName} / {t.impColSlug} / {t.impColCode} / {t.impColPrice} / {t.impColStock} /{' '}
            {t.impColColor} / {t.impColSize} / {t.impColCategory} / {t.impColBrand} /{' '}
            {t.impColStatus} / {t.impColGender}
          </p>
        </div>
      </div>

      {/* 上传区 */}
      <div className="border border-line p-4 mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="text-xs mb-3 block"
        />
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => upload(true)} disabled={busy}>
            {busy ? t.impParsing : t.impDryRun}
          </button>
          <button
            className="text-xs px-4 py-2 bg-ink text-bg hover:opacity-90 disabled:opacity-50"
            onClick={() => upload(false)}
            disabled={busy}
          >
            {busy ? t.impParsing : t.impUpload}
          </button>
        </div>
      </div>

      {err && (
        <p className="mb-4 text-xs text-red-600 break-words border border-red-300 bg-red-50 p-3">
          {err}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div className="border border-line p-4">
          <p className="text-sm text-ink mb-3">
            {result.dryRun ? `[${t.impDryRun}] ` : ''}
            {result.summary}
          </p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Stat label={t.impCreated} value={result.created} />
            <Stat label={t.impUpdated} value={result.updated} />
            <Stat label={t.impSkipped} value={result.skipped} />
            <Stat label={t.impFailed} value={result.failed} danger={result.failed > 0} />
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="text-xs tracking-widest text-muted mb-1">{t.impErrorList}</p>
              <div className="border border-line divide-y divide-line max-h-64 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-[11px] px-3 py-1.5 text-ink-soft">
                    {e.row > 0 ? `${t.impRow} ${e.row}: ` : ''}
                    {e.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="border border-line p-2 text-center">
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`font-display text-lg ${danger ? 'text-red-600' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
