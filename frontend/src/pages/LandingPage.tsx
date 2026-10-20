import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../features/auth/useAuth";

export function LandingPage() {
  const { user } = useAuth();
  return (
    <section data-testid="landing" className="mx-auto max-w-6xl px-4 py-16">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-gold-600">
          Compiler construction, made visible
        </p>
        <h1 className="font-display text-5xl leading-tight text-brand-brown-900 md:text-6xl">
          Watch a program pass through every stage of a compiler.
        </h1>
        <p className="mt-6 text-lg text-brand-brown-500">
          Compiler Lab is a playground for <strong>ZubaanScript</strong>, a small Hinglish-flavoured
          language. Write code once and see the lexer, parser, semantic analyser, and intermediate
          code generator each explain their work.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={user ? "/workspace" : "/register"}>
            <Button size="lg">{user ? "Open workspace" : "Get started"}</Button>
          </Link>
          <Link to="/docs">
            <Button size="lg" variant="secondary">
              View docs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
