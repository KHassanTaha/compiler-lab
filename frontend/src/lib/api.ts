/**
 * The single HTTP client. Every network call in the app goes through here so
 * token attachment and the 401/403/500 policy are defined exactly once
 * (AGENTS §12.2). A per-call-site fetch is a defect.
 */

import { clearSession, getToken } from "./auth";
import { toast } from "./toast";
import type {
  AdminStats,
  AdminUserSummary,
  EngineResult,
  Example,
  GrammarEntry,
  MessageResponse,
  Page,
  RegisterResponse,
  RunAllResult,
  RunDetail,
  RunSummary,
  SnippetDetail,
  SnippetSummary,
  TokenResponse,
  User,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

/** FastAPI 422 bodies carry `detail` as either a string or a list of errors. */
export interface ValidationDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export class ApiError extends Error {
  status: number;
  detail: string | ValidationDetail[] | null;

  constructor(status: number, detail: string | ValidationDetail[] | null) {
    super(typeof detail === "string" ? detail : `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip the global 401 redirect (used by the initial session probe). */
  silentAuth?: boolean;
}

let onUnauthorized: (() => void) | null = null;

/** Registered by the auth provider so 401s can redirect through the router. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, silentAuth = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    toast.error("Network error — could not reach the server.");
    throw new ApiError(0, "network_error");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      if (!silentAuth) {
        toast.error("Your session expired. Please sign in again.");
        onUnauthorized?.();
      }
    } else if (response.status === 403) {
      toast.error("Admin access required.");
    } else if (response.status >= 500) {
      toast.error("Something went wrong on the server.");
    }
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: string | ValidationDetail[] }).detail
        : null;
    throw new ApiError(response.status, detail);
  }

  return payload as T;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export const api = {
  // ---- Auth ----
  register: (body: { username: string; email: string; password: string }) =>
    request<RegisterResponse>("/auth/register", { method: "POST", body }),

  login: (body: { username: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body }),

  me: (silent = false) => request<User>("/auth/me", { silentAuth: silent }),

  changePassword: (body: { old_password: string; new_password: string }) =>
    request<MessageResponse>("/auth/change-password", { method: "POST", body }),

  // ---- Engines ----
  runEngine: (engine: "lex" | "parse" | "semantic" | "icg", code: string) =>
    request<EngineResult>(`/engines/${engine}`, { method: "POST", body: { code } }),

  runAll: (code: string) =>
    request<RunAllResult>("/engines/run-all", { method: "POST", body: { code } }),

  examples: () => request<{ items: Example[] }>("/examples"),

  grammar: () => request<{ items: GrammarEntry[] }>("/grammar"),

  // ---- Snippets ----
  listSnippets: () => request<Page<SnippetSummary>>("/snippets"),

  getSnippet: (id: number) => request<SnippetDetail>(`/snippets/${id}`),

  createSnippet: (body: { name: string; code: string }) =>
    request<SnippetDetail>("/snippets", { method: "POST", body }),

  updateSnippet: (id: number, body: { name: string; code: string }) =>
    request<SnippetDetail>(`/snippets/${id}`, { method: "PUT", body }),

  deleteSnippet: (id: number) => request<void>(`/snippets/${id}`, { method: "DELETE" }),

  // ---- History ----
  history: (params: Record<string, string | number | undefined | null> = {}) =>
    request<Page<RunSummary>>(`/history${queryString(params)}`),

  historyRun: (id: number) => request<RunDetail>(`/history/${id}`),

  // ---- Shared run ----
  sharedRun: (id: number) => request<RunDetail>(`/runs/${id}`),

  // ---- Admin ----
  adminRuns: (params: Record<string, string | number | undefined | null> = {}) =>
    request<Page<RunSummary>>(`/admin/runs${queryString(params)}`),

  adminRun: (id: number) => request<RunDetail>(`/admin/runs/${id}`),

  adminUsers: (params: Record<string, string | number | undefined | null> = {}) =>
    request<Page<AdminUserSummary>>(`/admin/users${queryString(params)}`),

  adminUser: (id: number) => request<AdminUserSummary>(`/admin/users/${id}`),

  adminStats: () => request<AdminStats>("/admin/stats"),
};
