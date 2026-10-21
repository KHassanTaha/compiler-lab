import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../features/auth/useAuth";

const FEATURES = [
  {
    key: "lexer",
    title: "Lexical analysis",
    symbol: "#",
    body: "Every character becomes a token. See identifiers, literals, operators, and comments labelled as the scanner reads them.",
  },
  {
    key: "parser",
    title: "Syntax analysis",
    symbol: "{}",
    body: "Tokens become a parse tree. Watch precedence and associativity shape the structure of your program.",
  },
  {
    key: "semantic",
    title: "Semantic analysis",
    symbol: "✓",
    body: "Types are checked, the symbol table is built, and undeclared or mistyped names are caught before execution.",
  },
  {
    key: "icg",
    title: "Intermediate code",
    symbol: "→",
    body: "The tree lowers to three-address code — the same shape a real compiler hands to its back end.",
  },
];

const SAMPLE = `kaam sum(n: int) -> int {
    wapas n + 1;
}

int x = 5;
likho(sum(x));
`;

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div data-testid="landing">
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(242,209,113,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(239,168,141,0.28),transparent_50%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-gold-600">
              Compiler construction, made visible
            </p>
            <h1
              data-testid="hero-heading"
              className="font-display text-5xl leading-tight text-brand-brown-900 md:text-6xl"
            >
              Watch a program pass through every stage of a compiler.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-brand-brown-500">
              Compiler Lab is a playground for <strong>ZubaanScript</strong>, a small Hinglish-flavoured
              language. Write code once and see the lexer, parser, semantic analyser, and intermediate
              code generator each explain their work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/workspace" : "/register"}>
                <Button size="lg" data-testid="cta-start">
                  {user ? "Open workspace" : "Start compiling"}
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="secondary" data-testid="cta-docs">
                  View docs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl text-brand-brown-900">Four stages, one playground</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.key} className="p-6" data-testid={`feature-${feature.key}`}>
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cream-200 font-mono text-brand-brown-700"
              >
                {feature.symbol}
              </span>
              <h3 className="mt-4 font-display text-lg text-brand-brown-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-brand-brown-500">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-brand-brown-900">
              Write ZubaanScript, read the compiler's mind
            </h2>
            <p className="mt-4 text-brand-brown-500">
              Run all four stages at once, expand any card to inspect its output in a formatted view or
              raw JSON, and keep every run in your searchable history.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-brand-border bg-white p-5 font-mono text-sm text-brand-brown-900 shadow-warm">
            {SAMPLE}
          </pre>
        </div>
      </section>
    </div>
  );
}
