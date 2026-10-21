import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { RunDetail } from "../lib/types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Skeleton";
import { formatDateTime } from "../lib/format";
import { statusTone } from "../lib/status";
import { RunResultView } from "../features/runs/RunResultView";

export function SharedRunPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runId = id ? Number(id) : null;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || Number.isNaN(runId)) {
      return;
    }
    let cancelled = false;
    api
      .sharedRun(runId)
      .then((data) => {
        if (cancelled) return;
        setRun(data);
        setLoadedId(runId);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load run.");
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const loading = runId !== null && loadedId !== runId && error === null;
  const invalidId = !runId || Number.isNaN(runId);

  return (
    <section data-testid="shared-run-root" className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/history" className="text-sm text-brand-gold-600 hover:underline">
          ← Back to history
        </Link>
        {run && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/workspace?redo=${run.id}`)}
          >
            Redo this run
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {invalidId && (
        <div className="rounded-lg border border-status-error-fg/30 bg-status-error-bg px-4 py-6 text-status-error-fg">
          Invalid run ID.
        </div>
      )}

      {error && !invalidId && (
        <div className="rounded-lg border border-status-error-fg/30 bg-status-error-bg px-4 py-6 text-status-error-fg">
          {error}
        </div>
      )}

      {!loading && !error && run && (
        <div className="flex flex-col gap-6">
          <header>
            <h1 className="font-display text-3xl text-brand-brown-900">
              Run #{run.id} by @{run.username}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-brown-500">
              <Badge tone={statusTone(run.status)}>{run.status ?? "—"}</Badge>
              <span>{run.action}</span>
              <span>· engine {run.engine ?? "—"}</span>
              <span>· {formatDateTime(run.created_at)}</span>
              <span>· {run.error_count ?? 0} errors</span>
            </div>
          </header>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-brown-500">
              Code
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg border border-brand-border bg-brand-cream-50 p-3 font-mono text-xs text-brand-brown-900">
              {run.code}
            </pre>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-brown-500">
              Results
            </p>
            <RunResultView resultJson={run.result_json} />
          </div>
        </div>
      )}
    </section>
  );
}
