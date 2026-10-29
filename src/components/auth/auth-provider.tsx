'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

  // ⚠️ 切换账号后必须同步：服务端传的 user 是首次渲染时的快照，
  //    登录/退出后若不同步，组件会一直读到旧身份。
  useEffect(() => {
    setCurrent(user);
  }, [user]);

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
