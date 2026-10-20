export function NotFoundPage() {
  return (
    <section data-testid="not-found" className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="font-display text-6xl text-brand-gold-500">404</p>
      <h1 className="mt-4 font-display text-3xl text-brand-brown-900">Page not found</h1>
      <p className="mt-3 text-brand-brown-500">
        That route does not exist. Try the workspace or the docs.
      </p>
    </section>
  );
}
