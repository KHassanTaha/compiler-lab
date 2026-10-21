import { useState } from "react";
import type { EngineCardStatus, EngineResult } from "../../lib/types";
import { Badge } from "../../components/ui/Badge";
import { CopyButton } from "../../components/ui/CopyButton";
import type { EngineConfig, EngineKey } from "./engineConfig";
import { ENGINE_BY_KEY, statusFor } from "./engineConfig";

interface EngineCardProps {
  engine: EngineKey;
  result: EngineResult | undefined;
  status: EngineCardStatus;
  onRun: (engine: EngineKey) => void;
  defaultOpen?: boolean;
}

const STATUS_LABEL: Record<EngineCardStatus, string> = {
  idle: "Idle",
  running: "Running…",
  success: "Pass",
  error: "Errors",
};

const STATUS_TONE = {
  idle: "neutral",
  running: "info",
  success: "success",
  error: "error",
} as const;

/** One engine's result panel: formatted view, raw JSON, errors, timing. */
export function EngineCard({ engine, result, status, onRun, defaultOpen = false }: EngineCardProps) {
  const config: EngineConfig = ENGINE_BY_KEY[engine];
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"formatted" | "raw">("formatted");

  const displayStatus: EngineCardStatus =
    status === "running" ? "running" : result ? statusFor(result) : status;

  return (
    <section
      data-testid={`engine-card-${engine}`}
      data-status={displayStatus}
      className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-warm"
    >
      <header className="flex items-center gap-3 border-b border-brand-border bg-brand-cream-50 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className={`text-brand-brown-500 transition-transform ${open ? "rotate-90" : ""}`}
          >
            ▸
          </span>
          <span className="font-display text-base text-brand-brown-900">{config.title}</span>
          <span className="hidden text-xs text-brand-brown-500 sm:inline">{config.description}</span>
        </button>

        {result && (
          <span className="font-mono text-xs text-brand-brown-500">{result.duration_ms} ms</span>
        )}
        <Badge tone={STATUS_TONE[displayStatus]}>{STATUS_LABEL[displayStatus]}</Badge>
        <button
          type="button"
          onClick={() => onRun(engine)}
          disabled={status === "running"}
          className="rounded-lg border border-brand-border bg-white px-2.5 py-1 text-xs text-brand-brown-700 hover:bg-brand-cream-100 disabled:opacity-60"
        >
          Run
        </button>
      </header>

      {open && (
        <div className="p-4">
          {displayStatus === "idle" && (
            <p className="text-sm text-brand-brown-500">
              Not run yet. Use Run All or run this stage on its own.
            </p>
          )}
          {displayStatus === "running" && <p className="text-sm text-brand-brown-500">Running…</p>}
          {result && displayStatus !== "running" && (
            <>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex rounded-lg border border-brand-border p-0.5">
                  {(["formatted", "raw"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTab(value)}
                      aria-pressed={tab === value}
                      className={`rounded-md px-3 py-1 text-xs capitalize ${
                        tab === value
                          ? "bg-brand-gold-500 text-brand-brown-900"
                          : "text-brand-brown-500"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {tab === "raw" && <CopyButton value={JSON.stringify(result.data, null, 2)} />}
              </div>

              {tab === "formatted" ? (
                config.renderFormatted(result)
              ) : (
                <pre
                  data-testid={config.rawTestId}
                  className="max-h-80 overflow-auto rounded-lg border border-brand-border bg-brand-cream-50 p-3 font-mono text-xs text-brand-brown-900"
                >
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
