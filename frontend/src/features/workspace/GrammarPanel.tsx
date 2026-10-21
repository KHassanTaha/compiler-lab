import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { GrammarEntry } from "../../lib/types";
import { Skeleton } from "../../components/ui/Skeleton";

/** Grammar reference accordion, loaded from GET /grammar. */
export function GrammarPanel() {
  const [entries, setEntries] = useState<GrammarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    api
      .grammar()
      .then((response) => {
        if (active) setEntries(response.items);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside
      data-testid="grammar-panel"
      className="rounded-xl border border-brand-border bg-white p-4 shadow-warm"
    >
      <h2 className="font-display text-lg text-brand-brown-900">Grammar</h2>
      <p className="mt-1 text-xs text-brand-brown-500">
        The EBNF productions ZubaanScript is parsed with.
      </p>

      {loading && (
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      )}
      {failed && (
        <p className="mt-4 text-sm text-status-error-fg">Could not load the grammar reference.</p>
      )}

      {!loading && !failed && (
        <ul className="mt-4 flex flex-col gap-1">
          {entries.map((entry, index) => {
            const open = openIndex === index;
            return (
              <li key={entry.non_terminal} className="rounded-lg border border-brand-border">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="font-mono text-xs text-brand-brown-900">
                    {entry.non_terminal}
                  </span>
                  <span aria-hidden="true" className="text-xs text-brand-brown-500">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-brand-border px-3 py-2">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-brand-brown-700">
                      {entry.production}
                    </pre>
                    <p className="mt-2 font-mono text-[11px] text-brand-brown-500">
                      {entry.example}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
