'use client';

import { createContext, useContext } from 'react';
import type { Locale } from '@/i18n/config';
import type { Dict } from '@/i18n/dictionaries';

type LocaleCtx = { locale: Locale; dict: Dict };

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: LocaleCtx & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, dict }}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
