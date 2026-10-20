import { useEffect, useState } from "react";
import { subscribe, dismiss } from "../../lib/toast";
import type { Toast as ToastModel, ToastKind } from "../../lib/toast";

const TONES: Record<ToastKind, string> = {
  success: "border-status-success-fg/30 bg-status-success-bg text-status-success-fg",
  error: "border-status-error-fg/30 bg-status-error-bg text-status-error-fg",
  info: "border-status-info-fg/30 bg-status-info-bg text-status-info-fg",
};

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

/** Top-right host for the imperative toast store. */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastModel[]>([]);

  useEffect(() => subscribe(setToasts), []);

  return (
    <div
      data-testid="toast-host"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-warm ${TONES[item.kind]}`}
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border border-current text-[10px] font-bold"
          >
            {ICONS[item.kind]}
          </span>
          <p className="flex-1 text-sm">{item.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(item.id)}
            className="text-current/70 hover:text-current"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
