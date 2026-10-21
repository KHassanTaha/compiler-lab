/**
 * Normalises a stored run's `result_json` into the per-engine map the engine
 * cards render. The backend always stores results keyed by engine label
 * (`{"lexer": {...}, ...}`) — a single-engine run has one key, `run-all` has
 * four (engines.py::_log_run). Neither shape carries a nested `run_id`.
 */

import type { EngineKey, EngineResult } from "./types";

const KEYS: EngineKey[] = ["lexer", "parser", "semantic", "icg"];

export type EngineMap = Partial<Record<EngineKey, EngineResult>>;

function asResult(value: unknown): EngineResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<EngineResult>;
  if (typeof candidate.engine !== "string" || typeof candidate.status !== "string") {
    return null;
  }
  return candidate as EngineResult;
}

/** Returns the engines present in a stored `result_json`, in canonical order. */
export function normalizeResultJson(
  resultJson: Record<string, unknown> | null,
): EngineMap {
  if (!resultJson) return {};
  const map: EngineMap = {};
  for (const key of KEYS) {
    const result = asResult(resultJson[key]);
    if (result) map[key] = result;
  }
  return map;
}

/** The engine keys present in a stored result, in canonical order. */
export function presentEngines(map: EngineMap): EngineKey[] {
  return KEYS.filter((key) => map[key] !== undefined);
}
