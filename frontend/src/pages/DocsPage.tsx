import { CopyButton } from "../components/ui/CopyButton";
import { API_REFERENCE, EBNF, KEYWORDS } from "../lib/docsContent";

const SECTIONS = [
  { id: "grammar", label: "Grammar (EBNF)" },
  { id: "keywords", label: "Keyword mapping" },
  { id: "api", label: "API reference" },
];

const AUTH_TONE: Record<string, string> = {
  public: "text-status-success-fg",
  user: "text-status-info-fg",
  admin: "text-status-warning-fg",
};

export function DocsPage() {
  return (
    <section data-testid="docs-root" className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl text-brand-brown-900">ZubaanScript Docs</h1>
      <p className="mt-3 max-w-2xl text-brand-brown-500">
        The grammar, the keyword map, and the API surface — everything you need to write and reason
        about ZubaanScript programs.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="h-max lg:sticky lg:top-20" aria-label="Docs sections">
          <ul className="flex flex-wrap gap-2 lg:flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-2 text-sm text-brand-brown-700 hover:bg-brand-cream-100"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-12">
          <article id="grammar" className="scroll-mt-20">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl text-brand-brown-900">Grammar (EBNF)</h2>
              <CopyButton value={EBNF} label="Copy EBNF" />
            </div>
            <pre
              data-testid="docs-ebnf"
              className="overflow-x-auto rounded-xl border border-brand-border bg-white p-5 font-mono text-sm text-brand-brown-900 shadow-warm"
            >
              {EBNF}
            </pre>
          </article>

          <article id="keywords" className="scroll-mt-20">
            <h2 className="mb-3 font-display text-2xl text-brand-brown-900">Keyword mapping</h2>
            <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-warm">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-cream-100 text-xs uppercase tracking-wide text-brand-brown-500">
                  <tr>
                    <th className="px-4 py-3">Construct</th>
                    <th className="px-4 py-3">English</th>
                    <th className="px-4 py-3">ZubaanScript</th>
                  </tr>
                </thead>
                <tbody>
                  {KEYWORDS.map((row) => (
                    <tr key={row.construct} className="border-t border-brand-border">
                      <td className="px-4 py-2 text-brand-brown-500">{row.construct}</td>
                      <td className="px-4 py-2 text-brand-brown-500">{row.english}</td>
                      <td className="px-4 py-2 font-mono text-brand-brown-900">{row.hinglish}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article id="api" className="scroll-mt-20">
            <h2 className="mb-3 font-display text-2xl text-brand-brown-900">API reference</h2>
            <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-warm">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-cream-100 text-xs uppercase tracking-wide text-brand-brown-500">
                  <tr>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">Auth</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {API_REFERENCE.map((row) => (
                    <tr key={`${row.method}-${row.path}`} className="border-t border-brand-border">
                      <td className="px-4 py-2 font-mono text-xs text-brand-brown-900">{row.method}</td>
                      <td className="px-4 py-2 font-mono text-xs text-brand-brown-700">{row.path}</td>
                      <td className={`px-4 py-2 text-xs font-medium ${AUTH_TONE[row.auth]}`}>
                        {row.auth}
                      </td>
                      <td className="px-4 py-2 text-brand-brown-500">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
