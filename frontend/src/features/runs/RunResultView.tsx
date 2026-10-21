import type { EngineKey } from "../../lib/types";
import { statusFor } from "../workspace/engineConfig";
import { EngineCard } from "../workspace/EngineCard";
import { normalizeResultJson, presentEngines } from "../../lib/runResult";
import type { EngineMap } from "../../lib/runResult";

interface RunResultViewProps {
  resultJson: Record<string, unknown> | null;
  /** When true, cards show collapsed; otherwise errored cards start open. */
  defaultCollapsed?: boolean;
}

/** Renders a stored run's engine outputs as read-only engine cards. */
export function RunResultView({ resultJson, defaultCollapsed = false }: RunResultViewProps) {
  const map: EngineMap = normalizeResultJson(resultJson);
  const engines: EngineKey[] = presentEngines(map);

  if (engines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-border bg-white/60 px-4 py-6 text-sm text-brand-brown-500">
        This run has no stored engine output.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {engines.map((engine) => (
        <EngineCard
          key={engine}
          engine={engine}
          result={map[engine]}
          status={statusFor(map[engine])}
          onRun={() => {}}
          readOnly
          defaultOpen={!defaultCollapsed && map[engine]?.status === "error"}
        />
      ))}
      <p className="text-xs text-brand-brown-500">
        {engines.length} of 4 stages recorded for this run
      </p>
    </div>
  );
}
