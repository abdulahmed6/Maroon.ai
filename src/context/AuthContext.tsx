import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "@/services/authService";
import { demoSession } from "@/services/demoSession";
import { profileService } from "@/services/profileService";
import type { AuthSession, ProfileUpdate, SignUpDetails } from "@/types";
import { AuthContext, type AuthContextValue } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Restore the Supabase session after hydration to avoid SSR mismatches.
  useEffect(() => {
    let active = true;
    const demo = demoSession.restore();
    if (demo) {
      setSession(demo);
      setIsReady(true);
      return () => {
        active = false;
      };
    }
    authService
      .getSession()
      .then((restored) => {
        if (active) setSession(restored);
      })
      .catch(() => {
        /* treat an unreadable session as signed out */
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    const unsubscribe = authService.onChange((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (internetId: string, password: string) => {
    setSession(await authService.signIn(internetId, password));
  }, []);

  const signUp = useCallback(async (details: SignUpDetails) => {
    setSession(await authService.signUp(details));
  }, []);

  const startDemo = useCallback(() => {
    setSession(demoSession.start());
  }, []);

  const studentId = session?.student.id;
  const isDemo = demoSession.isDemoUser(studentId);
  const updateProfile = useCallback(
    async (update: ProfileUpdate) => {
      if (!studentId) throw new Error("You're signed out. Sign in again.");
      const student = isDemo
        ? demoSession.update(update)
        : await profileService.update(studentId, update);
      setSession((current) => (current ? { ...current, student } : current));
    },
    [studentId, isDemo],
  );

  const logout = useCallback(() => {
    setSession(null);
    demoSession.end();
    void authService.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      student: session?.student ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      isReady,
      needsOnboarding: Boolean(session && !session.student.onboardedAt),
      login,
      signUp,
      startDemo,
      isDemo,
      updateProfile,
      logout,
    }),
    [session, isReady, login, signUp, startDemo, isDemo, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
