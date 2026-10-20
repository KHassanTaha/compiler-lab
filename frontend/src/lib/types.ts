/**
 * Shared API types. These mirror the backend Pydantic schemas one-for-one
 * (backend/app/schemas.py). If a field name differs here, the UI will read
 * `undefined` silently — keep both sides in sync when the contract changes.
 */

export type Role = "user" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

export interface MessageResponse {
  message: string;
}

export type Severity = "error" | "warning";

export interface EngineError {
  message: string;
  line: number;
  column: number;
  severity: Severity | string;
  phase: string;
}

export type EngineKey = "lexer" | "parser" | "semantic" | "icg";

export interface EngineResult {
  engine: string;
  status: "success" | "error" | string;
  duration_ms: number;
  error_count: number;
  data: Record<string, unknown>;
  errors: EngineError[];
  run_id?: number | null;
}

export interface RunAllResult {
  lex: EngineResult;
  parse: EngineResult;
  semantic: EngineResult;
  icg: EngineResult;
  run_id: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SnippetSummary {
  id: number;
  name: string;
  code_preview: string;
  created_at: string;
  updated_at: string;
}

export interface SnippetDetail {
  id: number;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface RunSummary {
  id: number;
  user_id: number;
  username: string;
  action: string;
  engine: string | null;
  status: string | null;
  error_count: number | null;
  code_preview: string;
  created_at: string;
}

export interface RunDetail {
  id: number;
  user_id: number;
  username: string;
  action: string;
  engine: string | null;
  status: string | null;
  error_count: number | null;
  code: string;
  result_json: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminUserSummary {
  id: number;
  username: string;
  email: string;
  role: Role;
  run_count: number;
  last_active: string | null;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_runs: number;
  error_rate: number;
  runs_today: number;
}

export interface Example {
  id: string;
  title: string;
  category: string;
  expected: string;
  code: string;
}

export interface GrammarEntry {
  non_terminal: string;
  production: string;
  example: string;
}
