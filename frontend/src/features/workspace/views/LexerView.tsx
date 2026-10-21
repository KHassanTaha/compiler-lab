import type { LexerData } from "../../../lib/types";

const TOKEN_TONE: Record<string, string> = {
  KEYWORD: "bg-brand-gold-100 text-brand-brown-900",
  TYPE: "bg-status-info-bg text-status-info-fg",
  IDENT: "bg-brand-cream-200 text-brand-brown-900",
  INT_LIT: "bg-status-success-bg text-status-success-fg",
  FLOAT_LIT: "bg-status-success-bg text-status-success-fg",
  STR_LIT: "bg-status-warning-bg text-status-warning-fg",
  BOOL_LIT: "bg-status-warning-bg text-status-warning-fg",
  OPERATOR: "bg-brand-peach-100 text-brand-brown-900",
  PUNCTUATION: "bg-status-neutral-bg text-status-neutral-fg",
  COMMENT: "bg-status-neutral-bg text-status-neutral-fg italic",
  EOF: "bg-status-neutral-bg text-status-neutral-fg",
};

/** Lexer formatted view: token table + per-type summary. */
export function LexerView({ data }: { data: LexerData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-cream-200 px-3 py-1 text-xs text-brand-brown-700">
          {data.summary.total} tokens
        </span>
        {Object.entries(data.summary.by_type).map(([type, count]) => (
          <span
            key={type}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              TOKEN_TONE[type] ?? "bg-status-neutral-bg text-status-neutral-fg"
            }`}
          >
            {type}: {count}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-brand-border">
        <table data-testid="lexer-tokens-table" className="w-full text-left text-sm">
          <thead className="bg-brand-cream-100 text-xs uppercase tracking-wide text-brand-brown-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Line</th>
              <th className="px-3 py-2">Col</th>
            </tr>
          </thead>
          <tbody>
            {data.tokens.map((token, index) => (
              <tr key={index} className="border-t border-brand-border">
                <td className="px-3 py-1.5 text-xs text-brand-brown-500">{index + 1}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-xs ${
                      TOKEN_TONE[token.type] ?? "bg-status-neutral-bg text-status-neutral-fg"
                    }`}
                  >
                    {token.type}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-brand-brown-900">
                  {token.value || "⟨EOF⟩"}
                </td>
                <td className="px-3 py-1.5 text-xs text-brand-brown-500">{token.line}</td>
                <td className="px-3 py-1.5 text-xs text-brand-brown-500">{token.column}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
