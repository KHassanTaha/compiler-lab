import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "../ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level render-error boundary. React only supports this via a class
 * component (componentDidCatch / getDerivedStateFromError) — the sole
 * sanctioned exception to the functional-component rule. Shows a friendly
 * themed page instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The one place console.error is permitted (AGENTS §12.2).
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section data-testid="error-boundary" className="mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="font-display text-5xl text-status-error-fg">Something broke</p>
          <h1 className="mt-3 font-display text-2xl text-brand-brown-900">
            The compiler hit an unexpected fault.
          </h1>
          <p className="mt-3 text-brand-brown-500">
            An unexpected error occurred while rendering this page.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={() => window.location.assign("/")}>
              Reload Compiler Lab
            </Button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
