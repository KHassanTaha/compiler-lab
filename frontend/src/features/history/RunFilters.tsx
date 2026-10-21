import { Button } from "../../components/ui/Button";
import type { RunFilters as Filters } from "./filters";
import {
  ACTION_OPTIONS,
  EMPTY_FILTERS,
  ENGINE_OPTIONS,
  STATUS_OPTIONS,
  hasActiveFilters,
} from "./filters";

interface RunFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  /** Admin adds a user dropdown, rendered after the date fields. */
  extra?: React.ReactNode;
}

const FIELD =
  "rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-brown-900";

/** Filter bar shared by History and Admin (PRD §15). */
export function RunFilters({ filters, onChange, extra }: RunFiltersProps) {
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div
      data-testid="history-filters"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-border bg-white p-4"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
        Action
        <select
          aria-label="Action"
          className={FIELD}
          value={filters.action}
          onChange={(event) => set("action", event.target.value)}
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
        Engine
        <select
          aria-label="Engine"
          className={FIELD}
          value={filters.engine}
          onChange={(event) => set("engine", event.target.value)}
        >
          {ENGINE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
        Status
        <select
          aria-label="Status"
          className={FIELD}
          value={filters.status}
          onChange={(event) => set("status", event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
        Search code
        <input
          type="search"
          aria-label="Search code"
          placeholder="substring of code…"
          className={`${FIELD} w-48`}
          value={filters.q}
          onChange={(event) => set("q", event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
        From
        <input
          type="date"
          aria-label="From"
          className={FIELD}
          value={filters.from}
          onChange={(event) => set("from", event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-brand-brown-700">
        To
        <input
          type="date"
          aria-label="To"
          className={FIELD}
          value={filters.to}
          onChange={(event) => set("to", event.target.value)}
        />
      </label>

      {extra}

      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
