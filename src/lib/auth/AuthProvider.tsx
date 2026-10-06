"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { UserProfile } from "@/lib/data/types";
import { logAudit, revokeAllSessions, subscribeUserProfile } from "@/lib/data/users";
import { clearUserScopedStorage } from "./email-link";

type AuthState = { user: User | null; profile: UserProfile | null; loading: boolean; error: string | null };
type AuthContextValue = AuthState & {
  retry: () => void;
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
const INITIAL: AuthState = { user: null, profile: null, loading: true, error: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL);
  const [attempt, setAttempt] = useState(0);
  const previousUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let generation = 0;
    let unsubscribeProfile: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const stopProfile = () => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      clearTimeout(timeout);
    };
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const current = ++generation;
      stopProfile();
      const switched = previousUid.current !== undefined && previousUid.current !== null && previousUid.current !== user?.uid;
      previousUid.current = user?.uid ?? null;
      setState({ user, profile: null, loading: !!user, error: null });
      // Keep a persisted draft during the initial session resolution; clear on a known account change.
      const cleanup = switched ? clearUserScopedStorage() : Promise.resolve();
      if (!user) {
        void cleanup.catch(() => undefined);
        return;
      }
      const fail = (message: string) => {
        if (current !== generation) return;
        clearTimeout(timeout);
        setState({ user, profile: null, loading: false, error: message });
      };
      timeout = setTimeout(() => fail("Your account could not be loaded. Check your connection and try again."), 15000);
      void (async () => {
        await cleanup;
        const token = await user.getIdTokenResult();
        if (current !== generation) return;
        const signedInAt = Number(token.claims.auth_time ?? 0) * 1000;
        unsubscribeProfile = subscribeUserProfile(user.uid, (profile) => {
          if (current !== generation) return;
          clearTimeout(timeout);
          const revokedAt = profile?.sessionsRevokedAt?.toMillis() ?? 0;
          if (revokedAt && revokedAt >= signedInAt) {
            fail("This session has expired. Please sign in again.");
            void signOut(auth).catch(() => fail("This session has expired. Please sign out and sign in again."));
            return;
          }
          setState({ user, profile, loading: false, error: null });
        }, () => fail("We could not load your account. Check your connection or contact support if the problem continues."));
      })().catch(() => fail("We could not verify your session. Check your connection and try again."));
    }, () => {
      ++generation;
      stopProfile();
      setState({ user: null, profile: null, loading: false, error: "Sign-in is unavailable. Please try again." });
    });
    return () => {
      ++generation;
      unsubscribeAuth();
      stopProfile();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, profile: null, loading: true, error: null }));
    setAttempt((value) => value + 1);
  }, []);
  const logout = useCallback(async () => {
    const user = auth.currentUser;
    if (user) void logAudit(user.uid, "logout");
    await signOut(auth);
    await clearUserScopedStorage();
  }, []);
  const logoutAllDevices = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    await revokeAllSessions(user.uid);
    void logAudit(user.uid, "logout_all_devices");
    await signOut(auth);
    await clearUserScopedStorage();
  }, []);
  const getToken = useCallback(async () => auth.currentUser ? auth.currentUser.getIdToken() : null, []);
  const value = useMemo(() => ({ ...state, retry, getToken, logout, logoutAllDevices }), [state, retry, getToken, logout, logoutAllDevices]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
