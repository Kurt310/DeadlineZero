import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  /** True while restoring a persisted session on launch. */
  isRestoring: boolean;
  /** False until Supabase project keys are set — guest/offline mode. */
  isConfigured: boolean;
  userId: string;
  email: string;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signInGuest: () => void;
  signOut: () => Promise<void>;
}

export const GUEST_ID = 'guest-user';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState(GUEST_ID);
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted session + follow auth changes (real backend only).
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        const user = data.session?.user;
        if (user) {
          setUserId(user.id);
          setEmail(user.email ?? '');
          setIsAuthenticated(true);
        }
        setIsRestoring(false);
      })
      .catch(() => {
        if (active) setIsRestoring(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? '');
        setIsAuthenticated(true);
        setError(null);
      } else {
        setUserId(GUEST_ID);
        setEmail('');
        setIsAuthenticated(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (nextEmail: string, password: string) => {
    // Offline/mock mode (mirrors Flutter): any valid form signs in as guest.
    if (!supabase) {
      setUserId(GUEST_ID);
      setEmail(nextEmail);
      setIsAuthenticated(true);
      setError(null);
      return true;
    }
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: nextEmail,
      password,
    });
    if (err || !data.user) {
      setError(err?.message ?? 'Sign-in failed');
      return false;
    }
    return true;
  }, []);

  const signUp = useCallback(async (nextEmail: string, password: string) => {
    if (!supabase) {
      setUserId(GUEST_ID);
      setEmail(nextEmail);
      setIsAuthenticated(true);
      setError(null);
      return true;
    }
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: nextEmail,
      password,
    });
    if (err || !data.user) {
      setError(err?.message ?? 'Sign-up failed');
      return false;
    }
    if (!data.session) {
      setError('Account created — confirm your email, then sign in.');
      return false;
    }
    return true;
  }, []);

  const signInGuest = useCallback(() => {
    setUserId(GUEST_ID);
    setEmail('guest@deadlinezero.io');
    setIsAuthenticated(true);
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUserId(GUEST_ID);
    setEmail('');
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated, isRestoring, isConfigured: isSupabaseConfigured,
      userId, email, error, signIn, signUp, signInGuest, signOut,
    }),
    [isAuthenticated, isRestoring, userId, email, error, signIn, signUp, signInGuest, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
