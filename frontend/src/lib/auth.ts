/**
 * Token storage and JWT claim decoding.
 *
 * The token lives in localStorage so a refresh keeps the session. Claims are
 * decoded client-side purely to drive routing (role gating) — the backend is
 * always the authority and re-checks every request.
 */

import type { Role, User } from "./types";

const TOKEN_KEY = "compiler-lab.token";
const USER_KEY = "compiler-lab.user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

interface JwtClaims {
  sub: string;
  role: Role;
  exp: number;
}

export function decodeToken(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload as JwtClaims;
  } catch {
    return null;
  }
}

export function isExpired(token: string): boolean {
  const claims = decodeToken(token);
  if (!claims) return true;
  return claims.exp * 1000 <= Date.now();
}
