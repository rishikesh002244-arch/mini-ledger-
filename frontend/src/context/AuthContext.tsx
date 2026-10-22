import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiClientError, setUnauthorizedHandler } from '../lib/api';
import { sessionStorage } from '../lib/storage';
import { authApi } from '../api/auth';
import type { User } from '../types';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    await sessionStorage.clear();
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const signIn = useCallback(async (nextToken: string, nextUser: User) => {
    await sessionStorage.write({ token: nextToken, user: nextUser });
    setToken(nextToken);
    setUser(nextUser);
    setStatus('signedIn');
  }, []);

  // Restore a session, then refresh the profile in the background.
  useEffect(() => {
    let active = true;

    const restore = async () => {
      const session = await sessionStorage.read();

      if (!session) {
        if (active) setStatus('signedOut');
        return;
      }

      if (!active) return;
      setToken(session.token);
      setUser(session.user);
      setStatus('signedIn');

      try {
        const freshUser = await authApi.me(session.token);
        if (!active) return;
        setUser(freshUser);
        await sessionStorage.write({ token: session.token, user: freshUser });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          await sessionStorage.clear();
          if (active) {
            setToken(null);
            setUser(null);
            setStatus('signedOut');
          }
        }
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from a protected endpoint ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });

    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, token, user, signIn, signOut }),
    [status, token, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};
