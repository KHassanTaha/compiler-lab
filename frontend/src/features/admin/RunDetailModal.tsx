import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { RunDetail } from "../../lib/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Skeleton";
import { formatDateTime } from "../../lib/format";
import { statusTone } from "../../lib/status";
import { RunResultView } from "../runs/RunResultView";

interface RunDetailModalProps {
  runId: number | null;
  onClose: () => void;
  onRedo: (run: RunDetail) => void;
}

/** Admin row-detail dialog: full code, metadata, and stored engine outputs. */
export function RunDetailModal({ runId, onClose, onRedo }: RunDetailModalProps) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = runId !== null;

  useEffect(() => {
    if (runId === null) return;
    let cancelled = false;
    api
      .adminRun(runId)
      .then((data) => {
        if (!cancelled) {
          setRun(data);
          setLoadedId(runId);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load run.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const loading = open && loadedId !== runId;

  return (
    <Modal
      open={open}
      title={run ? `Run #${run.id} — ${run.username}` : "Run detail"}
      onClose={onClose}
      size="xl"
      footer={
        run && (
          <Button variant="secondary" onClick={() => onRedo(run)}>
            Redo as run
          </Button>
        )
      }
    >
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {!loading && error && <p className="py-6 text-status-error-fg">{error}</p>}

      {!loading && !error && run && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-brand-brown-500">
            <Badge tone={statusTone(run.status)}>{run.status ?? "—"}</Badge>
            <span>{run.action}</span>
            <span>· engine {run.engine ?? "—"}</span>
            <span>· {formatDateTime(run.created_at)}</span>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-brown-500">
              Code
            </p>
            <pre className="max-h-56 overflow-auto rounded-lg border border-brand-border bg-brand-cream-50 p-3 font-mono text-xs text-brand-brown-900">
              {run.code}
            </pre>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-brown-500">
              Outputs
            </p>
            <RunResultView resultJson={run.result_json} />
          </div>
        </div>
      )}
    </Modal>
  );
}
