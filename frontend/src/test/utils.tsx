import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";

/** Wrap a page in the router + auth provider it depends on. */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}
