import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocsPage } from "../pages/DocsPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { renderWithProviders } from "../test/utils";

describe("DocsPage", () => {
  it("renders the EBNF grammar block", () => {
    renderWithProviders(<DocsPage />, { route: "/docs" });
    const block = screen.getByTestId("docs-ebnf");
    expect(block).toHaveTextContent("program");
    expect(block).toHaveTextContent("::=");
  });

  it("renders the keyword mapping and API reference tables", () => {
    renderWithProviders(<DocsPage />, { route: "/docs" });
    expect(screen.getByText("agar")).toBeInTheDocument();
    expect(screen.getByText("/api/engines/run-all")).toBeInTheDocument();
  });
});

describe("NotFoundPage", () => {
  it("shows the themed 404 copy and a back-home action", () => {
    renderWithProviders(<NotFoundPage />, { route: "/nope" });
    expect(screen.getByText(/lost in compilation/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back home/i })).toBeInTheDocument();
  });
});
