import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setAccessTokenGetter } from '@/api/client';
import {
  clearSignupDraft,
  getSecureItem,
  removeSecureItem,
  setSecureItem,
} from '@/api/sessionStore';
import type { UserProfile } from '@/api/types';

type SessionState = {
  token: string | null;
  user: UserProfile | null;
  ready: boolean;
  setSession: (token: string, user: UserProfile) => Promise<void>;
  clearSession: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await getSecureItem('sessionToken');
        if (!cancelled) {
          setToken(stored);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setAccessTokenGetter(() => token);
    return () => setAccessTokenGetter(null);
  }, [token]);

  const setSession = useCallback(async (nextToken: string, nextUser: UserProfile) => {
    await setSecureItem('sessionToken', nextToken);
    await clearSignupDraft();
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(async () => {
    await removeSecureItem('sessionToken');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      setSession,
      clearSession,
      setUser,
    }),
    [token, user, ready, setSession, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
