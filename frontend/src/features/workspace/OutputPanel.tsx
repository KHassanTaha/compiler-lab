import type { EngineCardStatus, EngineKey, EngineResult } from "../../lib/types";
import { toast } from "../../lib/toast";
import { Button } from "../../components/ui/Button";
import { CopyButton } from "../../components/ui/CopyButton";
import { EngineCard } from "./EngineCard";
import { ENGINES } from "./engineConfig";

interface OutputPanelProps {
  results: Partial<Record<EngineKey, EngineResult>>;
  statuses: Record<EngineKey, EngineCardStatus>;
  onRunEngine: (engine: EngineKey) => void;
  onRunAll: () => void;
  running: boolean;
  shareRunId: number | null;
}

/** Right column: the four engine cards plus a run/share action bar. */
export function OutputPanel({
  results,
  statuses,
  onRunEngine,
  onRunAll,
  running,
  shareRunId,
}: OutputPanelProps) {
  const hasResults = Object.keys(results).length > 0;

  const onShare = () => {
    if (shareRunId === null) {
      toast.info("Run the program first to get a shareable link.");
      return;
    }
    const link = `${window.location.origin}/runs/${shareRunId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success(`Link copied: /runs/${shareRunId}`))
      .catch(() => toast.error("Could not copy the link."));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg text-brand-brown-900">Engine output</h2>
        <div className="flex items-center gap-2">
          {hasResults && (
            <span className="text-xs text-brand-brown-500">
              {Object.keys(results).length} of 4 stages run
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={onRunAll} loading={running}>
            Run All
          </Button>
          <CopyButton value={shareRunId ? `${window.location.origin}/runs/${shareRunId}` : ""} />
          <Button size="sm" onClick={onShare} disabled={shareRunId === null}>
            Share
          </Button>
        </div>
      </div>

      {ENGINES.map((engine) => (
        <EngineCard
          key={engine.key}
          engine={engine.key}
          result={results[engine.key]}
          status={statuses[engine.key]}
          onRun={onRunEngine}
          defaultOpen={statuses[engine.key] === "error"}
        />
      ))}
    </div>
  );
}
