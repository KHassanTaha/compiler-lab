/**
 * Shared filter/sort/pagination model for the runs tables used by both the
 * History page and the Admin dashboard. Keeping it in one module means the
 * two pages build identical query strings against the same backend contract
 * (PRD §8.4/§8.5, pins B1–B4).
 */

export interface RunFilters {
  action: string;
  engine: string;
  status: string;
  q: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: RunFilters = {
  action: "",
  engine: "",
  status: "",
  q: "",
  from: "",
  to: "",
};

export interface RunsQuery {
  filters: RunFilters;
  sort: string;
  page: number;
  pageSize: number;
}

export const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "engine_run", label: "Engine run" },
  { value: "input_saved", label: "Input saved" },
];

export const ENGINE_OPTIONS = [
  { value: "", label: "All engines" },
  { value: "lexer", label: "Lexer" },
  { value: "parser", label: "Parser" },
  { value: "semantic", label: "Semantic" },
  { value: "icg", label: "ICG" },
  { value: "all", label: "Run all" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];

/** True when at least one filter deviates from its default. */
export function hasActiveFilters(filters: RunFilters): boolean {
  return (Object.keys(EMPTY_FILTERS) as (keyof RunFilters)[]).some(
    (key) => filters[key] !== EMPTY_FILTERS[key],
  );
}

/** Builds the `/history` or `/admin/runs` query object from the runs query. */
export function runsQueryParams(
  query: RunsQuery,
  extra: Record<string, string | number | undefined | null> = {},
): Record<string, string | number | undefined | null> {
  return {
    action: query.filters.action || undefined,
    engine: query.filters.engine || undefined,
    status: query.filters.status || undefined,
    q: query.filters.q || undefined,
    from: query.filters.from || undefined,
    to: query.filters.to || undefined,
    sort: query.sort,
    page: query.page,
    page_size: query.pageSize,
    ...extra,
  };
}
