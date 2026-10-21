import type { IcgData } from "../../../lib/types";

/** ICG formatted view: three-address code listing + counts + best-effort note. */
export function IcgView({ data }: { data: IcgData }) {
  return (
    <div className="flex flex-col gap-3">
      {data.note && (
        <p className="rounded-lg bg-status-warning-bg px-3 py-2 text-xs text-status-warning-fg">
          {data.note}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-brand-brown-700">
        <span className="rounded-full bg-brand-cream-200 px-3 py-1">
          {data.tac.length} instructions
        </span>
        <span className="rounded-full bg-brand-cream-200 px-3 py-1">
          {data.temp_count} temporaries
        </span>
        <span className="rounded-full bg-brand-cream-200 px-3 py-1">
          {data.label_count} labels
        </span>
      </div>

      <pre
        data-testid="tac-listing"
        className="max-h-80 overflow-auto rounded-lg border border-brand-border bg-brand-cream-50 p-3 font-mono text-xs leading-relaxed text-brand-brown-900"
      >
        {data.tac.length === 0 ? "No instructions generated." : data.tac.join("\n")}
      </pre>
    </div>
  );
}
