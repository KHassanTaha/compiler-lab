import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setUnauthorizedHandler } from "../../lib/api";
import { clearSession, getStoredUser, getToken, isExpired, setSession } from "../../lib/auth";
import type { User } from "../../lib/types";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";

/**
 * Reads the persisted session once, at module-init time, so the provider can
 * start in a settled state rather than calling setState synchronously inside
 * an effect (react-hooks/set-state-in-effect).
 */
function readInitialSession(): { user: User | null; valid: boolean } {
  const token = getToken();
  if (!token || isExpired(token)) {
    clearSession();
    return { user: null, valid: false };
  }
  return { user: getStoredUser(), valid: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readInitialSession);
  const [user, setUser] = useState<User | null>(initial.user);
  const [ready, setReady] = useState(!initial.valid);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setReady(true);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!initial.valid) return;
    // Confirm the restored session against the backend; the effect only
    // touches React state from the async callbacks, never synchronously.
    let active = true;
    api
      .me(true)
      .then((fresh) => {
        if (active) setUser(fresh);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [initial.valid, logout]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login({ username, password });
    setSession(response.access_token, response.user);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    await api.register({ username, email, password });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, register, logout, isAdmin: user?.role === "admin" }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
