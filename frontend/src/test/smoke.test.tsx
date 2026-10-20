import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { AppLayout } from "../components/layout/AppLayout";
import { AuthProvider } from "../features/auth/AuthProvider";

describe("ui atoms", () => {
  it("renders a button with its label", () => {
    render(<Button>Run All</Button>);
    expect(screen.getByRole("button", { name: "Run All" })).toBeInTheDocument();
  });

  it("disables the button while loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("renders a badge with its text label", () => {
    render(<Badge tone="success">success</Badge>);
    expect(screen.getByText("success")).toBeInTheDocument();
  });
});

describe("app shell", () => {
  it("renders the navbar and toast host", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppLayout>
            <div>content</div>
          </AppLayout>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("toast-host")).toBeInTheDocument();
  });
});
