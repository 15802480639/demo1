'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { SessionUser } from '@/lib/auth';

type AuthCtx = {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<SessionUser | null>(user);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setCurrent(null);
    }
  }, []);

  return (
    <Ctx.Provider value={{ user: current, setUser: setCurrent, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
