import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <section data-testid="not-found" className="mx-auto max-w-2xl px-4 py-24 text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-cream-200 font-mono text-4xl text-brand-brown-500"
      >
        {"{ }"}
      </div>
      <p className="mt-6 font-display text-6xl text-brand-gold-500">404</p>
      <h1 className="mt-2 font-display text-3xl text-brand-brown-900">
        This page got lost in compilation.
      </h1>
      <p className="mt-3 text-brand-brown-500">
        The route you requested does not exist — no tokens were emitted.
      </p>
      <div className="mt-8 flex justify-center">
        <Link to="/">
          <Button size="lg">Back home</Button>
        </Link>
      </div>
    </section>
  );
}
