import type { SemanticData } from "../../../lib/types";

/** Semantic formatted view: symbol table grouped by scope. */
export function SemanticView({ data }: { data: SemanticData }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-brand-border">
      <table data-testid="symbol-table" className="w-full text-left text-sm">
        <thead className="bg-brand-cream-100 text-xs uppercase tracking-wide text-brand-brown-500">
          <tr>
            <th className="px-3 py-2">Scope</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Line</th>
            <th className="px-3 py-2">Used</th>
          </tr>
        </thead>
        <tbody>
          {data.symbol_table.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-brand-brown-500">
                No symbols declared.
              </td>
            </tr>
          ) : (
            data.symbol_table.map((symbol, index) => (
              <tr key={index} className="border-t border-brand-border">
                <td className="px-3 py-1.5 font-mono text-xs text-brand-brown-500">
                  {symbol.scope}
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-brand-brown-900">{symbol.name}</td>
                <td className="px-3 py-1.5">
                  <span className="rounded-md bg-status-info-bg px-2 py-0.5 font-mono text-xs text-status-info-fg">
                    {symbol.type}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-brand-brown-500">{symbol.line}</td>
                <td className="px-3 py-1.5 text-xs">
                  {symbol.used ? (
                    <span className="text-status-success-fg">yes</span>
                  ) : (
                    <span className="text-status-warning-fg">no</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
