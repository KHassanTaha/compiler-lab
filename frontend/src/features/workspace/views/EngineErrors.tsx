import type { EngineError } from "../../../lib/types";

interface ErrorsProps {
  errors: EngineError[];
}

const SEVERITY_TONE: Record<string, string> = {
  error: "bg-status-error-bg text-status-error-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
};

/** Error/warning list shown under a card's formatted view. */
export function EngineErrors({ errors }: ErrorsProps) {
  if (errors.length === 0) return null;
  return (
    <ul data-testid="engine-errors" className="mt-3 flex flex-col gap-2">
      {errors.map((error, index) => (
        <li
          key={`${error.line}-${error.column}-${index}`}
          className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-cream-50 px-3 py-2"
        >
          <span className="rounded-md bg-brand-cream-200 px-2 py-0.5 font-mono text-xs text-brand-brown-700">
            {error.line}:{error.column}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              SEVERITY_TONE[error.severity] ?? "bg-status-neutral-bg text-status-neutral-fg"
            }`}
          >
            {error.severity}
          </span>
          <span className="flex-1 text-sm text-brand-brown-900">{error.message}</span>
        </li>
      ))}
    </ul>
  );
}
